# app/controllers/api/v1/searches_controller.rb
module Api
  module V1
    class SearchesController < ApplicationController
      include ActionController::Live

      # POST /api/v1/searches — standard JSON response (keep for backward compat)
      def create
        location = params.require(:location)

        keywords = if params[:keywords].is_a?(Array)
                     params[:keywords]
        elsif params[:keywords].is_a?(String)
                     params[:keywords].split(",").map(&:strip)
        else
                     nil
        end

        aggregator = HotelAggregator.new(
          location: location,
          check_in: params[:check_in],
          check_out: params[:check_out],
          keywords: keywords
        )

        results = aggregator.search

        render json: {
          location: location,
          keywords: keywords || HotelAggregator::DEFAULT_KEYWORDS,
          check_in: params[:check_in] || Date.tomorrow.to_s,
          check_out: params[:check_out] || (Date.tomorrow + 3).to_s,
          count: results.length,
          hotels: results
        }, status: :ok
      rescue ActionController::ParameterMissing => e
        render json: { error: e.message }, status: :unprocessable_entity
      rescue => e
        Rails.logger.error("[SearchesController] Unexpected error: #{e.message}")
        Rails.logger.error(e.backtrace.first(10).join("\n"))
        Sentry.capture_exception(e) if defined?(Sentry)
        render json: { error: "An unexpected error occurred. Please try again." }, status: :internal_server_error
      end

      # GET /api/v1/searches/stream — SSE streaming response
      def stream
        location = params.require(:location)

        keywords = if params[:keywords].is_a?(Array)
                     params[:keywords]
        elsif params[:keywords].is_a?(String)
                     params[:keywords].split(",").map(&:strip)
        else
                     nil
        end

        response.headers["Content-Type"] = "text/event-stream"
        response.headers["Cache-Control"] = "no-cache"
        response.headers["Connection"] = "keep-alive"
        response.headers["X-Accel-Buffering"] = "no"
        response.headers["Access-Control-Allow-Origin"] = ENV.fetch("FRONTEND_URL", "http://localhost:5173")
        response.headers["Access-Control-Allow-Credentials"] = "true"

        aggregator = StreamingHotelAggregator.new(
          location: location,
          check_in: params[:check_in],
          check_out: params[:check_out],
          keywords: keywords,
          stream: response.stream
        )

        aggregator.search
      rescue ActionController::ParameterMissing => e
        send_sse(response.stream, { error: e.message }, event: "error")
      rescue => e
        Rails.logger.error("[SearchesController] Stream error: #{e.message}")
        Sentry.capture_exception(e) if defined?(Sentry)
        send_sse(response.stream, { error: "An unexpected error occurred." }, event: "error")
      ensure
        response.stream.close
      end

      private

      def send_sse(stream, data, event: "message")
        stream.write("event: #{event}\n")
        stream.write("data: #{data.to_json}\n\n")
      end
    end
  end
end

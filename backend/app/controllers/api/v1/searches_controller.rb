# app/controllers/api/v1/searches_controller.rb
module Api
  module V1
    class SearchesController < ApplicationController
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
        render json: { error: "An unexpected error occurred. Please try again." }, status: :internal_server_error
      end
    end
  end
end

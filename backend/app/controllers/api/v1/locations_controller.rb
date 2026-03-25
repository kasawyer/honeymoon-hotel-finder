# app/controllers/api/v1/locations_controller.rb
module Api
  module V1
    class LocationsController < ApplicationController
      # GET /api/v1/locations?query=Par
      #
      # Returns city autocomplete suggestions from Google Places.
      #
      def index
        query = params.require(:query)

        if query.length < 2
          render json: { locations: [] }
          return
        end

        suggestions = GooglePlacesService.new.autocomplete(query)

        render json: { locations: suggestions }
      rescue ActionController::ParameterMissing => e
        render json: { error: e.message }, status: :unprocessable_entity
      rescue => e
        Rails.logger.error("[LocationsController] #{e.message}")
        render json: { locations: [] }
      end
    end
  end
end

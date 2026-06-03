# app/controllers/api/v1/status_controller.rb
module Api
  module V1
    class StatusController < ApplicationController
      # GET /api/v1/status
      def show
        render json: {
          api_usage: ApiUsageTracker.all_usage,
          degraded_providers: ApiUsageTracker.degraded_providers,
          exhausted_providers: ApiUsageTracker.exhausted_providers,
          cache_stats: HotelCache.stats
        }
      end
    end
  end
end

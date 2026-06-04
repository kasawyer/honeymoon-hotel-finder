# config/initializers/redis.rb
redis_url = ENV.fetch("REDIS_URL", "redis://localhost:6379/1")

ssl_params = if redis_url.start_with?("rediss://")
               { verify_mode: OpenSSL::SSL::VERIFY_NONE }
else
               {}
end

REDIS = Redis.new(url: redis_url, ssl_params: ssl_params)

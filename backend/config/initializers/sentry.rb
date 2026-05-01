# config/initializers/sentry.rb
Sentry.init do |config|
  config.dsn = ENV["SENTRY_DSN"]

  # Only enable in production (don't send dev errors to Sentry)
  config.enabled_environments = %w[production]

  # Set the release version for tracking deploys
  config.release = "honeymoon-hotel-finder@#{ENV.fetch('HEROKU_RELEASE_VERSION', 'dev')}"

  # Performance monitoring — sample 20% of requests
  config.traces_sample_rate = 0.2

  # Capture 100% of errors
  config.sample_rate = 1.0

  # Filter out sensitive data
  config.before_send = lambda do |event, _hint|
    # Strip API keys from any error reports
    event.extra&.each do |key, value|
      if key.to_s =~ /key|token|secret|password|dsn/i
        event.extra[key] = "[FILTERED]"
      end
    end
    event
  end

  # Tag errors with useful context
  config.before_send_transaction = lambda do |event, _hint|
    event
  end
end

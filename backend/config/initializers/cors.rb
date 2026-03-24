# config/initializers/cors.rb
#
# Allow the React frontend to make requests to this API.
# In development: React runs on localhost:5173
# In production: set FRONTEND_URL to your Heroku app URL
#
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("FRONTEND_URL", "http://localhost:5173")

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      max_age: 86400
  end
end

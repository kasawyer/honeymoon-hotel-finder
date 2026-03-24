# config/initializers/rack_attack.rb
class Rack::Attack
  # Limit searches to 30/min per IP (protects our API quotas)
  throttle("api/searches", limit: 30, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/searches") && req.post?
  end

  # Limit autocomplete to 60/min per IP
  throttle("api/locations", limit: 60, period: 60) do |req|
    req.ip if req.path.start_with?("/api/v1/locations") && req.get?
  end
end

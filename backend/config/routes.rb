# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :searches, only: [ :create ]
      resources :locations, only: [ :index ]
    end
  end

  # Health check endpoint for Heroku and uptime monitors
  get "up", to: proc { [ 200, { "Content-Type" => "text/plain" }, [ "OK" ] ] }
end

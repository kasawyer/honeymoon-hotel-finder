# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :searches, only: [ :create ] do
        collection do
          get :stream
        end
      end
      resources :locations, only: [ :index ]
      resource :status, only: [ :show ], controller: "status"
    end
  end

  # Health check endpoint for Heroku and uptime monitors
  get "up", to: proc { [ 200, { "Content-Type" => "text/plain" }, [ "OK" ] ] }

  # Serve the React frontend for any non-API route (must be last)
  get "*path", to: proc { [ 200, {}, [ File.read(Rails.root.join("public", "index.html")) ] ] },
      constraints: ->(req) { !req.path.start_with?("/api/", "/up") }
end

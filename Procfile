web: cd backend && bundle exec puma -C config/puma.rb
worker: cd backend && bundle exec sidekiq -C config/sidekiq.yml
release: cd backend && bundle exec rails db:migrate
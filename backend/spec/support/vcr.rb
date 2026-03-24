require "vcr"

VCR.configure do |config|
  config.cassette_library_dir = "spec/cassettes"
  config.hook_into :webmock
  config.ignore_localhost = true
  config.configure_rspec_metadata!

  # Filter sensitive data from recordings
  config.filter_sensitive_data("<GOOGLE_API_KEY>") { ENV.fetch("GOOGLE_MAPS_API_KEY", "test_key") }
  config.filter_sensitive_data("<RAPIDAPI_KEY>") { ENV.fetch("RAPIDAPI_KEY", "test_key") }
end

FactoryBot.define do
  factory :cached_search do
    location { "MyString" }
    query { "MyString" }
    latitude { 1.5 }
    longitude { 1.5 }
    results { "" }
    expires_at { "2026-03-24 18:54:09" }
  end
end

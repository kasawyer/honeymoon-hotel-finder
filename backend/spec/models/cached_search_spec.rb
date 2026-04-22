require "rails_helper"

RSpec.describe CachedSearch, type: :model do
  describe "validations" do
    it "requires location" do
      search = CachedSearch.new(query: "romantic", expires_at: 1.hour.from_now)
      expect(search).not_to be_valid
      expect(search.errors[:location]).to include("can't be blank")
    end

    it "requires query" do
      search = CachedSearch.new(location: "paris", expires_at: 1.hour.from_now)
      expect(search).not_to be_valid
      expect(search.errors[:query]).to include("can't be blank")
    end

    it "requires expires_at" do
      search = CachedSearch.new(location: "paris", query: "romantic")
      expect(search).not_to be_valid
      expect(search.errors[:expires_at]).to include("can't be blank")
    end
  end

  describe ".find_valid" do
    it "returns active cache entries" do
      search = CachedSearch.create!(
        location: "paris",
        query: "romantic,honeymoon",
        results: [ { name: "Hotel Amour" } ],
        expires_at: 1.hour.from_now
      )
      found = CachedSearch.find_valid(location: "Paris", query: "romantic,honeymoon")
      expect(found).to eq(search)
    end

    it "ignores expired cache entries" do
      CachedSearch.create!(
        location: "paris",
        query: "romantic,honeymoon",
        results: [ { name: "Hotel Amour" } ],
        expires_at: 1.hour.ago
      )
      found = CachedSearch.find_valid(location: "Paris", query: "romantic,honeymoon")
      expect(found).to be_nil
    end
  end

  describe "#expired?" do
    it "returns true when past expiration" do
      search = CachedSearch.new(expires_at: 1.minute.ago)
      expect(search).to be_expired
    end

    it "returns false when still valid" do
      search = CachedSearch.new(expires_at: 1.hour.from_now)
      expect(search).not_to be_expired
    end
  end
end

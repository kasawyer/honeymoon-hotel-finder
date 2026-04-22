# app/models/cached_search.rb
class CachedSearch < ApplicationRecord
  validates :location, presence: true
  validates :query, presence: true
  validates :expires_at, presence: true

  scope :active, -> { where("expires_at > ?", Time.current) }
  scope :expired, -> { where("expires_at <= ?", Time.current) }

  # Find a valid (non-expired) cache entry
  def self.find_valid(location:, query:)
    active.find_by(location: location.downcase.strip, query: query)
  end

  def expired?
    expires_at <= Time.current
  end
end

class CreateCachedSearches < ActiveRecord::Migration[7.1]
  def change
    create_table :cached_searches do |t|
      t.string :location, null: false
      t.string :query, null: false
      t.float :latitude
      t.float :longitude
      t.jsonb :results, default: []
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :cached_searches, [:location, :query], unique: true
  end
end
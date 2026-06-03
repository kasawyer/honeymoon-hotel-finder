require "rails_helper"

RSpec.describe ApiUsageTracker do
  before do
    described_class.reset
  end

  describe ".record" do
    it "increments the counter for a provider" do
      described_class.record(:tripadvisor)
      described_class.record(:tripadvisor)
      expect(described_class.usage(:tripadvisor)[:count]).to eq(2)
    end

    it "increments by a custom count" do
      described_class.record(:booking, count: 3)
      expect(described_class.usage(:booking)[:count]).to eq(3)
    end

    it "tracks providers independently" do
      described_class.record(:tripadvisor)
      described_class.record(:google)
      expect(described_class.usage(:tripadvisor)[:count]).to eq(1)
      expect(described_class.usage(:google)[:count]).to eq(1)
    end
  end

  describe ".usage" do
    it "returns zero count when no calls recorded" do
      usage = described_class.usage(:tripadvisor)
      expect(usage[:count]).to eq(0)
      expect(usage[:remaining]).to eq(500)
      expect(usage[:percentage]).to eq(0)
    end

    it "calculates remaining calls" do
      10.times { described_class.record(:tripadvisor) }
      usage = described_class.usage(:tripadvisor)
      expect(usage[:remaining]).to eq(490)
    end

    it "calculates percentage" do
      250.times { described_class.record(:tripadvisor) }
      usage = described_class.usage(:tripadvisor)
      expect(usage[:percentage]).to eq(50.0)
    end

    it "sets warning flag at 80% usage" do
      400.times { described_class.record(:tripadvisor) }
      expect(described_class.usage(:tripadvisor)[:warning]).to be true
    end

    it "does not set warning below 80%" do
      399.times { described_class.record(:tripadvisor) }
      expect(described_class.usage(:tripadvisor)[:warning]).to be false
    end

    it "sets exhausted flag at 95% usage" do
      475.times { described_class.record(:tripadvisor) }
      expect(described_class.usage(:tripadvisor)[:exhausted]).to be true
    end

    it "does not set exhausted below 95%" do
      474.times { described_class.record(:tripadvisor) }
      expect(described_class.usage(:tripadvisor)[:exhausted]).to be false
    end
  end

  describe ".available?" do
    it "returns true when under cutoff" do
      expect(described_class.available?(:tripadvisor)).to be true
    end

    it "returns false when at cutoff" do
      475.times { described_class.record(:tripadvisor) }
      expect(described_class.available?(:tripadvisor)).to be false
    end
  end

  describe ".warning?" do
    it "returns false when under warning threshold" do
      expect(described_class.warning?(:tripadvisor)).to be false
    end

    it "returns true when at warning threshold" do
      400.times { described_class.record(:tripadvisor) }
      expect(described_class.warning?(:tripadvisor)).to be true
    end
  end

  describe ".all_usage" do
    it "returns usage for all providers" do
      described_class.record(:tripadvisor)
      described_class.record(:google)
      usage = described_class.all_usage
      expect(usage.length).to eq(3)
      expect(usage.map { |u| u[:provider] }).to contain_exactly("tripadvisor", "booking", "google")
    end
  end

  describe ".degraded_providers" do
    it "returns empty when all providers are healthy" do
      expect(described_class.degraded_providers).to eq([])
    end

    it "returns providers at warning level" do
      400.times { described_class.record(:tripadvisor) }
      expect(described_class.degraded_providers).to include("tripadvisor")
    end
  end

  describe ".exhausted_providers" do
    it "returns empty when all providers are available" do
      expect(described_class.exhausted_providers).to eq([])
    end

    it "returns providers at cutoff level" do
      475.times { described_class.record(:tripadvisor) }
      expect(described_class.exhausted_providers).to include("tripadvisor")
    end
  end

  describe ".reset" do
    it "resets a single provider counter" do
      described_class.record(:tripadvisor)
      described_class.reset(:tripadvisor)
      expect(described_class.usage(:tripadvisor)[:count]).to eq(0)
    end

    it "resets all provider counters" do
      described_class.record(:tripadvisor)
      described_class.record(:google)
      described_class.reset
      expect(described_class.usage(:tripadvisor)[:count]).to eq(0)
      expect(described_class.usage(:google)[:count]).to eq(0)
    end
  end
end

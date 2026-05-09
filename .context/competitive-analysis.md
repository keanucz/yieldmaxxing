# CropGuard Competitive Analysis — Precision Agriculture Platforms

**Date:** 2026-05-09

---

## 1. Ackerprofi (Germany)

**URL:** https://www.ackerprofi.de

### What It Does
- Digital field record keeping ("Ackerschlagkartei") for documenting nutrient flows
- Automated fertiliser requirement calculation based on field and regional specifications
- Compliance checking against German fertiliser regulations (DuV)
- Soil sample and Nmin value imports
- Livestock nutrient calculation with grazing diary
- Precision farming integration (management zones, biomass maps)
- Generates mandated compliance documents (Anlage 5, 170kg N ceiling, substance flow balances)

### Pricing Model
| Farm Size | Cost |
|-----------|------|
| Base fee (main farm) | EUR 149/year |
| Additional sub-operations | EUR 49 each |
| 1-500 ha | EUR 1.00/ha |
| 501-1000 ha | EUR 0.50/ha |
| 1001+ ha | EUR 0.10/ha |
| Small farms (<20 ha) | EUR 99 flat rate |

All prices exclude 19% VAT. 30-day free trial available.

### Key Features & UX
- Automation-focused: batch bookings, combination bookings, automated invoice imports
- Fertiliser requirement checks during data entry
- PSM (pesticide) approval verification via official BVL database
- Mobile-first: web app + native mobile with offline capability
- Partner network: 100+ partners providing local support
- Automatically detects nitrate-vulnerable zones

### Data Required from Farmers
- Field/parcel information (importable from InVeKos or manual)
- Soil test results (NPK values)
- Nmin soil probe data
- Livestock inventory (if applicable)
- Fertiliser applications (type, quantity, date)
- Pesticide treatments
- Harvest data and crop rotations
- Delivery receipts from suppliers

### Relevance to CropGuard
- Heavy on **regulatory compliance** (German-specific)
- No supply chain disruption features
- No phone camera input
- No satellite monitoring built-in
- Targets medium-to-large German arable farms

---

## 2. OneSoil (Belarus/International)

**URL:** https://www.onesoil.ai

### What It Does
- Free satellite-based crop monitoring platform
- NDVI vegetation index tracking
- Automated field boundary detection (1-click from satellite)
- Growing degree-days and precipitation analysis
- Mobile scouting with photos and notes
- Weather forecast integration

### Pricing
- **Free tier:** Core satellite monitoring, NDVI, field detection, scouting, weather
- **OneSoil Pro** (paid): VRA maps, productivity zones, soil sampling module, field trials, yield analysis
  - Per-hectare subscription (pricing not publicly disclosed)
  - 14-day free trial
  - Documented savings: $36-45/ha average

### Pro Features (Paid)
- Variable-Rate Application (VRA) maps with control strips
- Productivity zones (automatic homogeneous area detection)
- Soil sampling by productivity zones
- Field trial management
- Yield analysis
- 9 years of historical satellite imagery

### Satellite Data
- Uses satellite imagery (likely Sentinel-2 based on resolution/frequency, though not explicitly confirmed on site)
- Processes historical data back 9 years

### Limitations
- VRA export formats not clearly documented publicly
- No phone camera disease detection
- No fertiliser alternative recommendations
- No supply chain disruption features
- Pro pricing opaque (must contact sales)
- No UK-specific localisation noted

---

## 3. Cropio / Cropwise Operations (Syngenta Digital)

**URL:** https://operations.cropwise.com (formerly cropio.com)

### What It Does
- "All-in-one digital farming solution" (enterprise-focused)
- Satellite vegetation monitoring
- Weather integration
- VRA maps
- Crop scouting
- Farm management and record keeping

### Pricing
- Enterprise/B2B model — pricing not publicly available
- Typically sold through Syngenta dealer network
- Custom quotes based on farm size and feature requirements

### Key Characteristics
- Acquired by Syngenta Digital — now branded "Cropwise Operations"
- Enterprise focus: large farms, agroholdings, agricultural companies
- Part of broader Syngenta digital ecosystem
- Mobile apps (iOS/Android)

### Limitations
- Not accessible to small/independent farmers (enterprise pricing)
- Tied to Syngenta ecosystem
- No phone camera features documented
- No fertiliser alternative/supply chain features
- No UK-specific focus

---

## 4. Climate FieldView (Bayer/Climate Corporation)

**URL:** https://climate.com

### What It Does
- Data collection and connectivity platform
- Field scouting (remote assessment)
- Prescription/seed script development
- Real-time yield analysis
- Hardware integration (FieldView Drive 2.0)
- 60+ partner platform integrations

### Pricing
| Tier | Cost | Key Features |
|------|------|--------------|
| Basic | Free | Data inbox, weather forecasts, scouting, cab app |
| Plus | $649+/year | Seed scripts, satellite imagery, yield analysis, VRA |

### Key Features
- FieldView Drive 2.0 hardware for in-cab data collection
- Wireless script transmission to equipment
- Satellite field health imagery (Plus tier)
- Split-view map comparisons
- External API connectivity
- Strong data ownership positioning ("own your data")

### Limitations
- Primarily North American market focus
- Requires hardware purchase for full capability
- No phone camera disease detection
- No fertiliser alternative recommendations
- No supply chain disruption features
- Expensive entry point for small farmers

---

## 5. Corvian (formerly Farmers Edge)

**URL:** https://corvian.com

### What It Does
- Enterprise technology platform for agriculture (rebranded 2025)
- Digital agronomy and farm productivity
- AI Agents and Data Management as a Service (DMaaS)
- Soil testing (via Farmers Edge Labs)
- Scope 3 traceability and compliance
- Insurance risk assessment
- Carbon/CI scoring

### Pricing
- Enterprise B2B model — custom pricing
- White-labelling and licensing available
- Claims 50% lower cost vs building in-house

### Key Characteristics
- Shifted from farmer-facing to B2B enterprise platform
- Backed by Fairfax Financial, led by ex-Amazon executives
- Serves: agriculture, food/CPG, fuel/energy, insurance, finance, sustainability
- No longer primarily a farmer tool — now an infrastructure provider

### Limitations
- No longer a direct-to-farmer product
- Enterprise-only pricing
- Not relevant for small/medium farmers
- No phone camera or supply chain features

---

## 6. PTx (formerly Trimble Agriculture)

**URL:** https://ptxag.com

### What It Does
- Precision agriculture hardware and guidance systems
- Variable-rate seeding, spraying, fertiliser application
- Guidance and auto-steer technology
- Brand-agnostic retrofit solutions for any machinery
- Farm management software (NEXT Farming — Europe only)

### Products
- **Precision-IQ**: Single-screen field operation management
- **20|20**: Agronomic data platform
- **OutRun**: Autonomous grain cart
- **FarmENGAGE**: Record-keeping and connectivity
- **Panorama**: Mobile mapping and data viewing
- **NEXT Farming**: EU farm management software

### Pricing
- Hardware-centric model (capital expenditure)
- Software subscriptions vary by product
- Premium pricing — targets medium-to-large commercial farms
- Sold through dealer network

### Limitations
- Hardware-heavy — significant upfront investment
- Complexity requires dealer support
- No phone camera features
- No fertiliser alternatives
- No supply chain focus
- Premium pricing excludes small farmers

---

## 7. xarvio (BASF Digital Farming)

**URL:** https://ag.xarvio.com

### What It Does
- AI-powered crop protection and agronomic advice
- Field-specific fungicide spray timing and dosage
- Variable-rate seeding maps ("expert level in less than a minute")
- Nutrition management combining growth stages, weather, satellite, field history
- Two-way machine connectivity (application maps to equipment, as-applied back)
- Weed zone spray mapping via drone imagery (ONE SMART SPRAY)

### Products
| Product | Focus |
|---------|-------|
| xFIELD MANAGER | Seeding, nutrition, crop protection, data management, connectivity |
| xHEALTHY FIELDS | Outcome-based fungicide strategy with success guarantee |
| ONE SMART SPRAY | Digital weed maps, precision herbicide application (24h turnaround) |

### Pricing
- Subscription model (not publicly disclosed)
- xHEALTHY FIELDS: outcome-based with compensation guarantee
  - 99.2% success rate (2022), 98% (2023)
  - "If recommendations don't achieve desired goal, we pay compensation"

### Performance Claims
- +28 EUR/ha gross margin from optimised fungicide timing
- 31% fungicide reduction
- +27 EUR/ha from VRA maps
- 25+ years of agronomic modelling experience
- 250+ annual validation trials globally

### Key Differentiators
- Success/outcome guarantee (unique in market)
- 40+ equipment partners (John Deere, CLAAS, Bosch)
- Two-way data flow with machinery
- Drone-based weed mapping (24h turnaround)

### Limitations
- No phone camera disease detection (despite image processing for drones)
- No fertiliser alternative recommendations
- No supply chain disruption features
- Focused on crop protection (fungicides, herbicides) not holistic farm management
- Pricing opaque

---

## 8. Yara Digital (Atfarm / N-Sensor)

**URL:** https://www.yara.com/crop-nutrition/digital-farming/

### What It Does
- Satellite-based variable-rate nitrogen application
- N-Sensor: tractor-mounted real-time crop sensing
- Atfarm: satellite VRA for nitrogen management
- YaraPlus: agronomic advice platform
- Megalab: soil/tissue analysis

### Key Stats
- 10+ digital solutions
- 60 countries
- 22.8 million hectares digitalised

### Pricing (Atfarm)
- Previously had a free tier for basic satellite NDVI
- Premium tiers for VRA map generation and export
- Note: Atfarm SSL certificate expired as of research date — may indicate product transition/sunset

### Key Features
- Nitrogen-specific optimisation
- ISOXML export for tractor-compatible prescription maps (historically documented)
- Integration with Yara fertiliser products

### Limitations
- Atfarm appears to be in transition (expired certificates, unclear product status)
- Nitrogen-only focus (not holistic)
- Tied to Yara product ecosystem
- No phone camera features
- No supply chain disruption features
- N-Sensor requires expensive hardware (EUR 20,000+)

---

## 9. Plantix (Phone Camera Specialist)

**URL:** https://plantix.net

### What It Does
- **Phone camera crop disease diagnosis** — take photo, get instant AI diagnosis
- Treatment recommendations (chemical and biological)
- Comprehensive disease library
- Expert community consultation
- Peer-to-peer knowledge sharing

### Pricing
- **Completely free** for farmers
- B2B revenue model (API Toolkit, Crop Insights, Demand Creation)

### Key Stats
- "#1 free app for crop diagnosis"
- 100+ million crop inquiries answered
- Available on Android (primary), multiple languages

### Limitations
- Diagnosis only — no field management, VRA, or yield tracking
- No satellite integration
- No fertiliser recommendations beyond treatment
- No supply chain features
- Primarily targets developing markets (Brazil, Indonesia, India)
- Limited iOS support historically
- No UK-specific crop models documented

---

## 10. Solvi (Drone-Based Analytics)

**URL:** https://www.solvi.ag

### What It Does
- Drone-based field trial analytics
- PlantAI: ML-powered plant detection and counting
- Zonal statistics from drone imagery
- Interactive mapping and classification
- Plot-level metrics extraction

### Pricing
- Free trial available
- Subscription model (not publicly disclosed)
- Enterprise clients: Bayer, Syngenta, Rijk Zwaan

### Target Market
- Researchers and agronomists (not direct-to-farmer)
- Seed companies, agrochemical R&D
- University research

### Limitations
- Requires drone hardware and flights
- Research/trial focused — not a farm management tool
- Not accessible to typical farmers
- No real-time monitoring
- No fertiliser or supply chain features

---

## Comparative Matrix

| Feature | Ackerprofi | OneSoil | Cropwise | FieldView | xarvio | Yara | Plantix | CropGuard |
|---------|:----------:|:-------:|:--------:|:---------:|:------:|:----:|:-------:|:---------:|
| **Free tier** | No (trial only) | Yes | No | Yes (basic) | No | Unclear | Yes | ? |
| **Satellite NDVI** | No | Yes | Yes | Yes (paid) | Yes | Yes | No | Yes |
| **Phone camera input** | No | No | No | No | No | No | **Yes** | **Yes** |
| **VRA map export** | No | Yes (Pro) | Yes | Yes (paid) | Yes | Yes | No | ? |
| **Fertiliser alternatives** | No | No | No | No | No | No | No | **Yes** |
| **Supply chain risk** | No | No | No | No | No | No | No | **Yes** |
| **UK-specific** | No (Germany) | No | No | No (USA) | Partial | Partial | No | **Yes** |
| **Small farmer UX** | Medium | Good | Poor | Medium | Medium | Medium | Excellent | **Target** |
| **Tractor prescriptions** | No | Unclear | Yes | Yes | Yes | Yes | No | ? |

---

## Key Gaps in Existing Solutions (CropGuard Opportunity)

### 1. No Platform Combines Phone Camera + Satellite + Fertiliser Alternatives
- **Plantix** does phone camera diagnosis but nothing else
- **OneSoil/xarvio** do satellite NDVI but no camera
- **Nobody** recommends fertiliser alternatives or substitutions
- CropGuard can uniquely bridge all three

### 2. No Platform Addresses Supply Chain Disruption
- Zero competitors model "what if fertiliser X becomes unavailable?"
- No scenario planning for Strait of Hormuz disruption, sanctions, etc.
- No alternative product recommendation engines
- This is a completely unoccupied niche

### 3. No Platform Targets UK Farmers Specifically
- Ackerprofi: Germany-only (DuV compliance)
- FieldView: primarily North America
- OneSoil: global but no UK localisation
- xarvio: European but no UK-specific advisory
- UK farmers lack a purpose-built digital tool that understands:
  - UK crop varieties and growing conditions
  - UK-available fertiliser products
  - UK regulatory environment (post-CAP)
  - UK supply chain dependencies

### 4. UX Complexity Barrier
- Most platforms (xarvio, Cropwise, PTx, FieldView) are complex enterprise tools
- Small UK farmers (average farm size ~87 ha) find these overwhelming
- Only Plantix and OneSoil achieve "simple" UX — but lack depth
- Opportunity for "simple UX + powerful insights"

### 5. Fertiliser Substitution Intelligence
- No existing tool helps farmers answer: "If I can't get product X, what's the equivalent alternative?"
- No platform considers nutrient equivalence across products
- No cost-comparison of alternative fertiliser sources
- No local availability checking

---

## Hackathon Differentiation — CropGuard's Unique Angle

### The Narrative
**"Strait of Hormuz + phone camera + satellite = actionable resilience for UK farmers"**

### What Makes CropGuard Unique (Combined)

1. **Supply chain disruption scenario modelling** — No competitor does this at all
2. **Phone camera + satellite fusion** — Plantix does camera only, OneSoil does satellite only. Nobody combines both for a unified crop health + recommendation engine
3. **Fertiliser alternative recommendations** — Zero competitors offer substitution advice when supply is disrupted
4. **UK-first** — No existing platform is purpose-built for UK agriculture
5. **Accessible UX** — Designed for small/medium UK farms, not enterprise agroholdings

### Competitive Positioning Statement
> "While xarvio optimises when to spray and OneSoil shows where crops are struggling, CropGuard is the only platform that tells UK farmers what to do when their usual fertiliser supply is cut off — combining phone-based crop assessment with satellite monitoring to recommend accessible alternatives."

### Strongest Differentiators for Judges

| Differentiator | Why It Matters | Who Else Does It? |
|----------------|---------------|-------------------|
| Supply chain risk modelling | Geopolitically relevant (Hormuz, sanctions, Brexit) | Nobody |
| Fertiliser substitution engine | Practical resilience for farmers | Nobody |
| Phone + satellite fusion | More accurate than either alone | Nobody (in one tool) |
| UK-specific focus | Underserved market | Nobody |
| "What if?" scenario planning | Proactive not reactive | Nobody in ag-tech |

### Narrative Hook for Hackathon Pitch
The Strait of Hormuz carries 20% of global oil and significant volumes of potash/phosphate fertiliser trade. A disruption there (or any supply shock — war, sanctions, port closure) leaves UK farmers scrambling. CropGuard gives them:
1. **See** the problem (satellite + phone camera shows crop stress)
2. **Understand** the cause (nutrient deficiency identification)
3. **Act** with alternatives (substitution recommendations from available UK sources)

This is not hypothetical — fertiliser prices spiked 300% in 2022 due to the Russia-Ukraine conflict, and many UK farmers had no digital tool to help them navigate alternatives.

---

## Pricing Strategy Insights

Based on competitor analysis, CropGuard should consider:

- **Free tier** for basic satellite monitoring + phone diagnosis (compete with OneSoil/Plantix)
- **Paid tier** for VRA maps, supply chain alerts, alternative recommendations
- **Per-hectare pricing** is the industry standard (EUR 0.50-1.50/ha typical)
- **Small farm friendly** pricing (flat rate under certain hectarage, like Ackerprofi's EUR 99 for <20ha)
- Avoid enterprise-only pricing that excludes target market

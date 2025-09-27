# PRD: Farmer-Friendly Credit Explanation Interface

## Overview
**Feature**: AI-powered explanations for Indonesian farmers  
**Users**: Indonesian farmers (primary), bank staff (secondary)  
**Goal**: Transform technical credit analysis into understandable farming advice

## Problem & Solution
Farmers receive complex technical data (NDVI: 0.7832, weather metrics) they cannot understand or act upon. Replace technical explanations with AI-generated, farmer-friendly advice in simple language that connects satellite data to practical farming decisions.

## User Stories
- **As a farmer**, I want to know if my crops are healthy in simple terms
- **As a farmer**, I want practical advice on improving my farm for better loans
- **As a farmer**, I want explanations in language I understand (Bahasa Indonesia preferred)

## Core Features

### AI Translation Engine
**From Technical Data To Farmer Language:**
- NDVI readings → "Tanaman Anda sehat/kurang sehat" (Your crops are healthy/unhealthy)
- Weather data → "Cuaca mendukung/mengancam panen" (Weather supports/threatens harvest)
- Credit scores → "Peluang pinjaman baik/perlu perbaikan" (Loan chances good/need improvement)

### Farming Advice Generator
**Practical Recommendations:**
- "Tanam tanaman penutup untuk memperbaiki tanah" (Plant cover crops to improve soil)
- "Pasang irigasi untuk mengurangi risiko kekeringan" (Install irrigation to reduce drought risk)
- "Diversifikasi tanaman untuk keamanan finansial" (Diversify crops for financial security)

## Technical Implementation

### Integration Points
- Replace hardcoded explanations in farmer results section (`index.html:365-383`)
- Add AI explanation generation after credit analysis
- Support bilingual output (English/Bahasa Indonesia)

### API Design
```
POST /api/farmer/explain
{
  "satelliteData": {...},
  "weatherData": {...},
  "farmDetails": {...},
  "language": "id" // Indonesian
}
```

### User Interface
**Farmer-Friendly Results Panel:**
```
┌─────────────────────────────────────┐
│  🌾 Penjelasan untuk Petani         │
├─────────────────────────────────────┤
│  Skor Kredit: 731 (Baik)           │
│  "Berdasarkan analisis satelit      │
│   sawah 1.5 hektar Anda..."        │
├─────────────────────────────────────┤
│  🌱 Kondisi Tanaman:                │
│  • Tanaman sehat                    │
│  • Cuaca mendukung                  │
│  • Cocok untuk bunga 7%            │
├─────────────────────────────────────┤
│  💡 Saran Perbaikan:                │
│  • Tanam penutup tanah             │
│  • Pasang sistem irigasi           │
│  • Pertimbangkan diversifikasi     │
└─────────────────────────────────────┘
```

### Data Processing
```
Satellite Data → AI Processing → Farmer Explanation
NDVI: 0.78    → AI Analysis   → "Tanaman Anda sehat"
Weather       → Translation   → "Cuaca cocok untuk padi"
Credit Score  → Simplification → "Peluang pinjaman baik"
```

## Success Criteria
- Generate explanations < 3 seconds
- 80%+ farmer comprehension (user testing)
- Reduce bank staff questions
- Support Indonesian language
- Maintain existing workflow integration
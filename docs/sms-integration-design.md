# SMS Integration Design

## Overview

Design for integrating SMS data patterns into credit scoring, based on proven agricultural finance methodologies.

## Data Points

### Communication Patterns
- **Daily SMS**: High digital engagement (+25 points)
- **Weekly SMS**: Good engagement (+20 points)
- **Monthly SMS**: Moderate engagement (+15 points)
- **Rare SMS**: Limited engagement (+5 points)

### Agricultural SMS Usage
- **Weather alerts**: +10 points (proactive farming)
- **Market price inquiries**: +15 points (market awareness)
- **Extension services**: +20 points (learning attitude)
- **Financial services**: +10 points (financial inclusion)

### Mobile Money
- **Regular transactions**: +20 points
- **Agricultural payments**: +25 points
- **Mobile banking**: +15 points

## Implementation Options

### Method 1: Self-Reporting
Simple questionnaire during farmer registration:
- SMS frequency ("daily", "weekly", "monthly", "rare")
- Agricultural SMS subscriptions (weather, market, extension)
- Mobile money usage patterns

### Method 2: Telecom Partnership
- Data sharing agreements with Indonesian operators (Telkomsel, Indosat, XL)
- Aggregated usage patterns (no message content)
- Real-time scoring API

### Method 3: Mobile App Integration
- Permission-based SMS analytics collection
- Real-time pattern analysis
- Direct integration with credit scoring

## Technical Integration

### Current Implementation
```python
def _calculate_digital_readiness(self, farm_data):
    sms_frequency = farm_data.get('sms_frequency', '[PLACEHOLDER]')
    # Currently uses placeholder data
    # Integration with telecom APIs planned
```

### Target Algorithm
```python
def analyze_sms_patterns(sms_data):
    score = 0
    frequency_scores = {'daily': 25, 'weekly': 20, 'monthly': 15, 'rare': 5}
    score += frequency_scores.get(sms_data['frequency'], 10)
    
    # Agricultural SMS bonuses
    if sms_data.get('weather_alerts'): score += 10
    if sms_data.get('market_prices'): score += 15
    if sms_data.get('extension_services'): score += 20
    
    return min(score, 100)
```

## Privacy & Compliance

### Indonesian Regulations
- **Law No. 11/2008**: Electronic Information and Transactions
- **OJK Data Protection**: Financial service data requirements
- **Explicit consent**: Clear opt-in for SMS data usage
- **Data minimization**: Only necessary patterns collected

### Implementation Requirements
- Transparent scoring explanations
- Right to data deletion
- Anonymized pattern analysis
- No personal message content access

## Expected Impact

### Credit Enhancement
- **5-15% score improvement** for farmers with strong SMS patterns
- **Better risk assessment** through digital literacy indicators
- **Financial inclusion** for farmers without traditional credit history

### Integration Status
- **Current**: Self-reporting questionnaire implemented
- **Planned**: Telecom partnership negotiations
- **Target**: Real-time SMS pattern scoring

*Last Updated: September 2025*
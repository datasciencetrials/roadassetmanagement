# National Road Asset Management System (RAMS)

Comprehensive repository for the National Road Asset Management System, covering national road network inventory, pavement asset condition, spatial infrastructure layers, and maintenance prioritization.

## Overview

The Road Asset Management platform integrates:
- **Frontend**: React and TypeScript portal for interactive spatial asset exploration, network condition analytics, and asset reporting.
- **Backend API**: Python FastAPI services for pavement analytics, condition deterioration modeling, and spatial queries.
- **Spatial Infrastructure**: Geonode, GeoServer, and PostGIS definitions for GIS enterprise asset integration.
- **Analytics & ML**: Pavement deterioration models, traffic forecasting, and multi-year maintenance needs analysis.

## Structure

```
├── frontend/       # React TypeScript application for Road Asset Management
├── backend/        # Python API services and data ingestion routes
├── geonode/        # Spatial infrastructure configurations
├── k8s/            # Deployment manifests
├── ml/             # Asset analytics and condition estimation models
├── scripts/        # Asset data curation and automated reporting scripts
└── sql/            # Database schema definitions and asset queries
```

## Standards & Architecture

All road network analyses adhere strictly to National Standards:
- Network lengths reported in physical kilometres (km) and percentage shares (%).
- Standard condition classification across paved and unpaved national road networks.
- Full geospatial district boundary alignment and road corridor chainage snapping.

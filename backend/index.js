console.log('Server starting...');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let hotels = [];

console.log('Loading Korean hotels from CSV...');
fs.createReadStream('../korea_hotels.csv')
  .pipe(csv({
    mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '')
  }))
  .on('data', (row) => {
    hotels.push({
      id: row.hotel_id,
      name: row.hotel_name,
      address: `${row.addressline1 || ''} ${row.addressline2 || ''}`.trim(),
      city: row.city,
      state: row.state,
      zipcode: row.zipcode,
      rooms: row.numberrooms || 'N/A',
      floors: row.numberfloors || 'N/A',
      yearOpened: row.yearopened || 'N/A',
      stars: parseFloat(row.star_rating) || 0,
      rating: parseFloat(row.rating_average) || 0,
      reviews: parseInt(row.number_of_reviews) || 0,
      latitude: row.latitude,
      longitude: row.longitude,
      photo: row.photo1,
      accommodationType: row.accommodation_type || 'N/A',
      chainName: row.chain_name || 'No Chain',
      phone: 'N/A',
      email: 'N/A',
    });
  })
  .on('end', () => {
    console.log(`Loaded ${hotels.length} Korean hotels`);
  });

app.get('/api/hotels', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const search = (req.query.search || '').toLowerCase();
  const minRating = parseFloat(req.query.minRating) || 0;
  const cityFilter = req.query.city || 'all';
  const typeFilter = req.query.type || 'all';
  const chainFilter = req.query.chain || 'all';
  const perPage = 20;

  let filtered = hotels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search);
    const matchesRating = (h.rating || 0) >= minRating;
    const matchesCity =
      cityFilter === 'all' ||
      (cityFilter === 'seoul' && h.city?.toLowerCase().includes('seoul')) ||
      (cityFilter === 'busan' && h.city?.toLowerCase().includes('busan')) ||
      (cityFilter === 'jeju' && h.city?.toLowerCase().includes('jeju'));
    const matchesType =
      typeFilter === 'all' || h.accommodationType === typeFilter;
    const matchesChain =
      chainFilter === 'all' ||
      (chainFilter === 'chain' && h.chainName !== 'No Chain') ||
      (chainFilter === 'independent' && h.chainName === 'No Chain');
    return matchesSearch && matchesRating && matchesCity && matchesType && matchesChain;
  });

  const start = page * perPage;
  const end = start + perPage;

  res.json({
    hotels: filtered.slice(start, end),
    total: filtered.length
  });
});

app.get('/api/accommodation-types', (req, res) => {
  const types = [...new Set(hotels.map(h => h.accommodationType).filter(Boolean))];
  res.json({ types });
});

app.post('/api/live-pricing', async (req, res) => {
  const { hotelIds } = req.body;

  if (!hotelIds || !hotelIds.length) {
    return res.json({ prices: {} });
  }

  try {
    const response = await axios.post(
      'http://affiliateapi7643.agoda.com/affiliateservice/lt_v1',
      {
        criteria: {
          additional: {
            currency: 'USD',
            discountOnly: false,
            language: 'en-us',
            occupancy: {
              numberOfAdult: 2,
              numberOfChildren: 0
            }
          },
          checkInDate: '2026-07-15',
          checkOutDate: '2026-07-16',
          hotelId: hotelIds.map(id => parseInt(id))
        }
      },
      {
        headers: {
          'Authorization': `${process.env.AGODA_SITE_ID}:${process.env.AGODA_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip,deflate'
        }
      }
    );

    const prices = {};
    (response.data.results || []).forEach(hotel => {
      prices[hotel.hotelId] = {
        dailyRate: hotel.dailyRate,
        crossedOutRate: hotel.crossedOutRate,
        currency: hotel.currency,
        discountPercentage: hotel.discountPercentage,
        landingURL: hotel.landingURL,
        freeWifi: hotel.freeWifi,
        includeBreakfast: hotel.includeBreakfast
      };
    });

    res.json({ prices });
  } catch (error) {
    console.error('Agoda API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch live pricing', prices: {} });
  }
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});

process.on('uncaughtException', (err) => {
  console.error('CRASH:', err);
});
console.log('Server starting...');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/api/hotels', async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const search = req.query.search || '';
  const minRating = parseFloat(req.query.minRating) || 0;
  const cityFilter = req.query.city || 'all';
  const typeFilter = req.query.type || 'all';
  const chainFilter = req.query.chain || 'all';
  const perPage = 20;

  try {
    let query = supabase
      .from('hotels')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('hotel_name', '%' + search + '%');
    }

    if (minRating > 0) {
      query = query.gte('rating_average', minRating);
    }

    if (cityFilter !== 'all') {
      query = query.ilike('city', '%' + cityFilter + '%');
    }

    if (typeFilter !== 'all') {
      query = query.eq('accommodation_type', typeFilter);
    }

    if (chainFilter === 'chain') {
      query = query.neq('chain_name', 'No Chain');
    } else if (chainFilter === 'independent') {
      query = query.eq('chain_name', 'No Chain');
    }

    const start = page * perPage;
    const end = start + perPage - 1;
    query = query.range(start, end);

    const result = await query;
    const data = result.data;
    const count = result.count;
    const error = result.error;

    if (error) throw error;

    const hotels = data.map(function (row) {
      return {
        id: row.hotel_id,
        name: row.hotel_name,
        address: (row.addressline1 || '') + ' ' + (row.addressline2 || ''),
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
        phone: row.phone || 'N/A',
        email: row.email || 'N/A',
        website: row.website || 'N/A',
        contacted: row.contacted || false
      };
    });

    res.json({ hotels: hotels, total: count });
  } catch (error) {
    console.error('Supabase query error:', error.message);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

app.get('/api/accommodation-types', async (req, res) => {
  try {
    const result = await supabase
      .from('hotels')
      .select('accommodation_type');

    if (result.error) throw result.error;

    const types = Array.from(new Set(result.data.map(function (r) {
      return r.accommodation_type;
    }).filter(Boolean)));

    res.json({ types: types });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ types: [] });
  }
});

app.post('/api/hotels/:id/contacted', async (req, res) => {
  const hotelId = req.params.id;
  const contacted = req.body.contacted;

  try {
    const result = await supabase
      .from('hotels')
      .update({ contacted: contacted })
      .eq('hotel_id', hotelId);

    if (result.error) throw result.error;

    res.json({ success: true, contacted: contacted });
  } catch (error) {
    console.error('Failed to update contacted status:', error.message);
    res.status(500).json({ error: 'Failed to update contacted status' });
  }
});

app.post('/api/live-pricing', async (req, res) => {
  const hotelIds = req.body.hotelIds;

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
          hotelId: hotelIds.map(function (id) {
            return parseInt(id);
          })
        }
      },
      {
        headers: {
          'Authorization': process.env.AGODA_SITE_ID + ':' + process.env.AGODA_API_KEY,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip,deflate'
        }
      }
    );

    const prices = {};
    (response.data.results || []).forEach(function (hotel) {
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

    res.json({ prices: prices });
  } catch (error) {
    console.error('Agoda API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch live pricing', prices: {} });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, function () {
  console.log('Server running on port ' + PORT);
});

process.on('uncaughtException', function (err) {
  console.error('CRASH:', err);
});
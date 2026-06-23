console.log('Server starting...');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/hotels', async (req, res) => {
  try {
    console.log('API KEY:', process.env.RAPIDAPI_KEY);
    const response = await axios.get(
      'https://apidojo-booking-v1.p.rapidapi.com/properties/list',
      {
        params: {
            offset: '0',
            arrival_date: '2026-06-23',
            departure_date: '2026-06-24',
            guest_qty: '1',
            dest_ids: '-716583',
            room_qty: '1',
            search_type: 'city',
            languagecode: 'en-us',
            price_filter_currencycode: 'USD',
            order_by: 'popularity',
          },
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'apidojo-booking-v1.p.rapidapi.com'
        }
      }
    );

    console.log(JSON.stringify(response.data).slice(0, 500));
    console.log('Keys:', Object.keys(response.data));
    const hotels = response.data.result.map(hotel => ({
        name: hotel.hotel_name,
        address: hotel.address,
        city: hotel.city,
        phone: hotel.phone || 'N/A',
        rooms: hotel.number_of_rooms || 'N/A',
        email: hotel.email || 'N/A',
        rating: hotel.review_score,
        stars: hotel.class
      }));
    res.json(hotels);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

app.listen(8000, () => {
  console.log('Server running on port 8000');
});

process.on('uncaughtException', (err) => {
  console.error('CRASH:', err);
});
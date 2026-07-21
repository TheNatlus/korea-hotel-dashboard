require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

console.log('API Key loaded:', process.env.GOOGLE_PLACES_API_KEY ? `${process.env.GOOGLE_PLACES_API_KEY.slice(0, 10)}...` : 'MISSING');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BATCH_LIMIT = 50;
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findContactInfo(hotelName, address, city) {
  try {
    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: `${hotelName}, ${address}, ${city}, South Korea`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.nationalPhoneNumber,places.websiteUri'
        }
      }
    );

    const place = response.data.places?.[0];
    if (!place) return { phone: null, website: null };

    return {
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null
    };
  } catch (error) {
    console.error('  Google Places error:', error.response?.data?.error?.message || error.message);
    return { phone: null, website: null };
  }
}

async function enrichBatch() {
  console.log(`Fetching up to ${BATCH_LIMIT} hotels pending enrichment...`);

  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('hotel_id, hotel_name, addressline1, city')
    .eq('enrichment_status', 'pending')
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('Failed to fetch hotels:', error.message);
    return;
  }

  console.log(`Found ${hotels.length} hotels to process.\n`);

  let foundCount = 0;
  let notFoundCount = 0;

  for (let i = 0; i < hotels.length; i++) {
    const hotel = hotels[i];
    console.log(`[${i + 1}/${hotels.length}] ${hotel.hotel_name}`);

    const result = await findContactInfo(
      hotel.hotel_name,
      hotel.addressline1,
      hotel.city
    );

    const status = result.phone ? 'found' : 'not_found';
    if (status === 'found') foundCount++;
    else notFoundCount++;

    const { error: updateError } = await supabase
      .from('hotels')
      .update({
        phone: result.phone,
        website: result.website,
        enrichment_status: status
      })
      .eq('hotel_id', hotel.hotel_id);

    if (updateError) {
      console.error('  Failed to update:', updateError.message);
    } else {
      console.log(`  → Phone: ${result.phone || 'not found'}`);
      console.log(`  → Website: ${result.website ? 'found' : 'not found'}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nBatch complete. Found: ${foundCount}, Not found: ${notFoundCount}`);
}

enrichBatch();
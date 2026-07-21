import { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [cityFilter, setCityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState('all');
  const [accommodationTypes, setAccommodationTypes] = useState([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/accommodation-types`)
      .then(res => res.json())
      .then(data => setAccommodationTypes(data.types))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page,
      search,
      minRating,
      city: cityFilter,
      type: typeFilter,
      chain: chainFilter
    });
    fetch(`${API_URL}/api/hotels?${params}`)
      .then(res => res.json())
      .then(data => {
        setHotels(data.hotels);
        setTotalCount(data.total);
        setLoading(false);

        const hotelIds = data.hotels.map(h => h.id).filter(Boolean);
        if (hotelIds.length > 0) {
          fetch(`${API_URL}/api/live-pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hotelIds })
          })
            .then(res => res.json())
            .then(priceData => {
              setHotels(prevHotels =>
                prevHotels.map(h => ({
                  ...h,
                  price: priceData.prices[h.id]?.dailyRate || null,
                  crossedOutRate: priceData.prices[h.id]?.crossedOutRate || null,
                  discountPercentage: priceData.prices[h.id]?.discountPercentage || 0,
                  bookingUrl: priceData.prices[h.id]?.landingURL || null
                }))
              );
            })
            .catch(err => console.error('Pricing fetch failed:', err));
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [page, search, minRating, cityFilter, typeFilter, chainFilter]);

  useEffect(() => {
    setPage(0);
  }, [search, minRating, cityFilter, typeFilter, chainFilter]);

  return (
    <div className="app">
      <div className="header">
        <div className="eyebrow">
          {['all', 'seoul', 'busan', 'jeju'].map(c => (
            <button
              key={c}
              className={`city-pill ${cityFilter === c ? 'active' : ''}`}
              onClick={() => setCityFilter(c)}
            >
              {c === 'all' ? 'Nationwide' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <h1>🇰🇷 Korea Hotel Dashboard</h1>
        <p>{totalCount} properties indexed</p>
      </div>

      <div className="filters">
        <input
          className="search"
          type="text"
          placeholder="Search hotels..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="rating-filter"
          value={minRating}
          onChange={e => setMinRating(Number(e.target.value))}
        >
          <option value={0}>All Ratings</option>
          <option value={7}>7+ Rating</option>
          <option value={8}>8+ Rating</option>
          <option value={9}>9+ Rating</option>
        </select>
        <select
          className="rating-filter"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {accommodationTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="rating-filter"
          value={chainFilter}
          onChange={e => setChainFilter(e.target.value)}
        >
          <option value="all">Chain or Independent</option>
          <option value="chain">Chain Only</option>
          <option value="independent">Independent Only</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading hotels...</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Hotel Name</th>
                  <th>Type</th>
                  <th>Chain</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Rooms</th>
                  <th>Stars</th>
                  <th>Rating</th>
                  <th>Reviews</th>
                  <th>Phone</th>
                  <th>Price/Night</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((hotel, i) => (
                  <tr key={i}>
                    <td>
                      {hotel.bookingUrl ? (
                        <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                          {hotel.name}
                        </a>
                      ) : (
                        hotel.name
                      )}
                    </td>
                    <td>{hotel.accommodationType}</td>
                    <td>{hotel.chainName}</td>
                    <td>{hotel.address}</td>
                    <td>{hotel.city}</td>
                    <td className="numeric">{hotel.rooms}</td>
                    <td><span className="star-badge">{hotel.stars}</span></td>
                    <td><span className="rating-badge">{hotel.rating}</span></td>
                    <td className="numeric">{hotel.reviews}</td>
                    <td className="numeric">{hotel.phone}</td>
                    <td className="numeric">
                      {hotel.price ? (
                        <>
                          ${hotel.price}
                          {hotel.discountPercentage > 0 && (
                            <span className="discount-badge">-{hotel.discountPercentage}%</span>
                          )}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
            <span>Page {page + 1} of {Math.ceil(totalCount / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 20 >= totalCount}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
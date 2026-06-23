import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/hotels?page=${page}`)
      .then(res => res.json())
      .then(data => {
        setHotels(data.hotels);
        setTotalCount(data.total);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [page]);

  const filtered = hotels.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) &&
    (h.rating || 0) >= minRating
  );

  return (
    <div className="app">
      <div className="header">
        <h1>🇰🇷 Korea Hotel Dashboard</h1>
        <p>{totalCount} hotels in Seoul</p>
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
          onChange={e => setMinRating(Number(e.target.value))}
        >
          <option value={0}>All Ratings</option>
          <option value={7}>7+ Rating</option>
          <option value={8}>8+ Rating</option>
          <option value={9}>9+ Rating</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading hotels...</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Hotel Name</th>
                <th>Address</th>
                <th>City</th>
                <th>Rating</th>
                <th>Stars</th>
                <th>Phone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((hotel, i) => (
                <tr key={i}>
                  <td>{hotel.name}</td>
                  <td>{hotel.address}</td>
                  <td>{hotel.city}</td>
                  <td>{hotel.rating || 'N/A'}</td>
                  <td>{'⭐'.repeat(hotel.stars) || 'N/A'}</td>
                  <td>{hotel.phone}</td>
                  <td>{hotel.email}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
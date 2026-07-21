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

  useEffect(function () {
    fetch(API_URL + '/api/accommodation-types')
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setAccommodationTypes(data.types);
      })
      .catch(function (err) {
        console.error(err);
      });
  }, []);

  useEffect(function () {
    setLoading(true);
    var params = new URLSearchParams({
      page: page,
      search: search,
      minRating: minRating,
      city: cityFilter,
      type: typeFilter,
      chain: chainFilter
    });
    fetch(API_URL + '/api/hotels?' + params.toString())
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setHotels(data.hotels);
        setTotalCount(data.total);
        setLoading(false);

        var hotelIds = data.hotels.map(function (h) {
          return h.id;
        }).filter(Boolean);

        if (hotelIds.length > 0) {
          fetch(API_URL + '/api/live-pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hotelIds: hotelIds })
          })
            .then(function (res) {
              return res.json();
            })
            .then(function (priceData) {
              setHotels(function (prevHotels) {
                return prevHotels.map(function (h) {
                  var priceInfo = priceData.prices[h.id] || {};
                  var updated = Object.assign({}, h);
                  updated.price = priceInfo.dailyRate || null;
                  updated.crossedOutRate = priceInfo.crossedOutRate || null;
                  updated.discountPercentage = priceInfo.discountPercentage || 0;
                  updated.bookingUrl = priceInfo.landingURL || null;
                  return updated;
                });
              });
            })
            .catch(function (err) {
              console.error('Pricing fetch failed:', err);
            });
        }
      })
      .catch(function (err) {
        console.error(err);
        setLoading(false);
      });
  }, [page, search, minRating, cityFilter, typeFilter, chainFilter]);

  useEffect(function () {
    setPage(0);
  }, [search, minRating, cityFilter, typeFilter, chainFilter]);

  function getMapUrl(name, address, city) {
    var query = name + ', ' + address + ', ' + city + ', South Korea';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function handleCityClick(c) {
    setCityFilter(c);
  }

  function handleSearchChange(e) {
    setSearch(e.target.value);
  }

  function handleRatingChange(e) {
    setMinRating(Number(e.target.value));
  }

  function handleTypeChange(e) {
    setTypeFilter(e.target.value);
  }

  function handleChainChange(e) {
    setChainFilter(e.target.value);
  }

  function goPrevPage() {
    setPage(function (p) {
      return p - 1;
    });
  }

  function goNextPage() {
    setPage(function (p) {
      return p + 1;
    });
  }

  function toggleContacted(hotelId, currentValue) {
    var newValue = !currentValue;

    setHotels(function (prevHotels) {
      return prevHotels.map(function (h) {
        if (h.id === hotelId) {
          var updated = Object.assign({}, h);
          updated.contacted = newValue;
          return updated;
        }
        return h;
      });
    });

    fetch(API_URL + '/api/hotels/' + hotelId + '/contacted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacted: newValue })
    }).catch(function (err) {
      console.error('Failed to save contacted status:', err);
    });
  }

  return (
    <div className="app">
      <div className="header">
        <div className="eyebrow">
          {['all', 'seoul', 'busan', 'jeju'].map(function (c) {
            var pillClass = 'city-pill';
            if (cityFilter === c) {
              pillClass = 'city-pill active';
            }
            var label = 'Nationwide';
            if (c !== 'all') {
              label = c.charAt(0).toUpperCase() + c.slice(1);
            }
            return (
              <button key={c} className={pillClass} onClick={function () { handleCityClick(c); }}>
                {label}
              </button>
            );
          })}
        </div>
        <h1>Korea Hotel Dashboard</h1>
        <p>{totalCount} properties indexed</p>
      </div>

      <div className="filters">
        <input
          className="search"
          type="text"
          placeholder="Search hotels..."
          value={search}
          onChange={handleSearchChange}
        />
        <select className="rating-filter" value={minRating} onChange={handleRatingChange}>
          <option value={0}>All Ratings</option>
          <option value={7}>7+ Rating</option>
          <option value={8}>8+ Rating</option>
          <option value={9}>9+ Rating</option>
        </select>
        <select className="rating-filter" value={typeFilter} onChange={handleTypeChange}>
          <option value="all">All Types</option>
          {accommodationTypes.map(function (t) {
            return <option key={t} value={t}>{t}</option>;
          })}
        </select>
        <select className="rating-filter" value={chainFilter} onChange={handleChainChange}>
          <option value="all">Chain or Independent</option>
          <option value="chain">Chain Only</option>
          <option value="independent">Independent Only</option>
        </select>
      </div>

      {loading && <div className="loading">Loading hotels...</div>}

      {!loading && (
        <div>
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
                  <th>Maps</th>
                  <th>Agoda</th>
                  <th>Contacted</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map(function (hotel, i) {
                  var priceCell = '—';
                  if (hotel.price) {
                    priceCell = '$' + hotel.price;
                  }

                  var mapLink = '—';
                  if (hotel.name) {
                    mapLink = getMapUrl(hotel.name, hotel.address, hotel.city);
                  }

                  var rowClass = hotel.contacted ? 'contacted-row' : '';

                  return (
                    <tr key={i} className={rowClass}>
                      <td>{hotel.name}</td>
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
                        {hotel.price && (
                          <span>
                            {priceCell}
                            {hotel.discountPercentage > 0 && (
                              <span className="discount-badge">
                                {'-' + hotel.discountPercentage + '%'}
                              </span>
                            )}
                          </span>
                        )}
                        {!hotel.price && '—'}
                      </td>
                      <td>
                        {mapLink !== '—' && (
                          <a href={mapLink} target="_blank" rel="noopener noreferrer" className="link-badge">
                            Map
                          </a>
                        )}
                        {mapLink === '—' && '—'}
                      </td>
                      <td>
                        {hotel.bookingUrl && (
                          <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer" className="link-badge">
                            Agoda
                          </a>
                        )}
                        {!hotel.bookingUrl && '—'}
                      </td>
                      <td>
                        <button
                          className={hotel.contacted ? 'contacted-btn active' : 'contacted-btn'}
                          onClick={function () { toggleContacted(hotel.id, hotel.contacted); }}
                        >
                          {hotel.contacted ? 'Contacted' : 'Mark Contacted'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button onClick={goPrevPage} disabled={page === 0}>Prev</button>
            <span>Page {page + 1} of {Math.ceil(totalCount / 20)}</span>
            <button onClick={goNextPage} disabled={(page + 1) * 20 >= totalCount}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createReview({ booking_id: booking.id, rating, comment });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal">
      <form className="modal-card" onSubmit={submit}>
        <h2>Review {booking.vendor_name}</h2>
        {error && <div className="alert">{error}</div>}

        <div className="mm-star-picker">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              className={`mm-star ${n <= rating ? 'mm-star-filled' : ''}`}
              onClick={() => setRating(n)}
              aria-label={`${n} star`}
            >★</button>
          ))}
        </div>

        <textarea
          placeholder="How was the service? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button className="primary full">Submit review</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}

export default function CustomerDashboard() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  async function load() {
    try {
      setRows(await api.customerBookings());
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function cancel(id) {
    await api.updateBookingStatus(id, 'cancelled');
    load();
  }

  function handleReviewSubmitted() {
    setReviewedIds((prev) => new Set(prev).add(reviewing.id));
    setReviewing(null);
    setMsg('Thanks for your review!');
  }

  return (
    <div className="page">
      <div className="section-head"><h1>Customer dashboard</h1><p>Track all your service requests and order statuses.</p></div>
      {msg && <div className="alert success">{msg}</div>}
      <div className="table-card">
        <table>
          <thead>
            <tr><th>Vendor</th><th>Service</th><th>City</th><th>Status</th><th>Preferred time</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.vendor_name}<small>{r.vendor_area}</small></td>
                <td>{r.service_category}</td>
                <td>{r.city}</td>
                <td><span className={`status ${r.status}`}>{r.status}</span></td>
                <td>{r.preferred_time}</td>
                <td>
                  {r.status === 'requested' && <button onClick={() => cancel(r.id)}>Cancel</button>}
                  {r.status === 'completed' && !reviewedIds.has(r.id) && (
                    <button className="mm-review-btn" onClick={() => setReviewing(r)}>Leave a review</button>
                  )}
                  {r.status === 'completed' && reviewedIds.has(r.id) && (
                    <span className="mm-reviewed-tag">Reviewed ✓</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No bookings yet. Book a local vendor to see orders here.</p>}
      </div>

      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
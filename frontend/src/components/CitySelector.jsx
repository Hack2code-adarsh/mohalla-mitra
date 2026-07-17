import React from 'react';
import { MapPin } from 'lucide-react';
const cities = ['Kanpur', 'Delhi', 'Lucknow', 'Gurugram', 'Noida'];
export default function CitySelector({city, setCity}) {
  return <label className="city-select"><MapPin size={16}/><select value={city} onChange={e => setCity(e.target.value)}>{cities.map(c => <option key={c}>{c}</option>)}</select></label>
}

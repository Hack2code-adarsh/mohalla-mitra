"""
Mohalla Mitra - Database Admin Dashboard
Run with: streamlit run admin_dashboard.py

Place this file in the same folder as mohalla_mitra.db (the backend folder).
"""

import streamlit as st
import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime

st.set_page_config(page_title="Mohalla Mitra Admin", layout="wide")

DB_PATH = Path(__file__).with_name("mohalla_mitra.db")

if not DB_PATH.exists():
    st.error(f"Database not found at: {DB_PATH}\n\nPlace this script in your `backend` folder, next to mohalla_mitra.db.")
    st.stop()

CITIES = ["Kanpur", "Delhi", "Lucknow", "Gurugram", "Noida"]
CATEGORIES = ["Electrician", "Plumber", "Tutor", "Tiffin", "Bike Mechanic", "Salon"]


def get_conn():
    return sqlite3.connect(DB_PATH)


def load_table(table_name, columns="*"):
    with get_conn() as conn:
        return pd.read_sql_query(f"SELECT {columns} FROM {table_name}", conn)


def run_query(query, params=()):
    with get_conn() as conn:
        conn.execute(query, params)
        conn.commit()


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


st.title("🏘️ Mohalla Mitra — Admin Dashboard")
st.caption(f"Connected to: {DB_PATH}")

tab_users, tab_vendors, tab_bookings, tab_sql = st.tabs(
    ["👤 Users", "🛠️ Vendors", "📦 Bookings", "🔍 Custom SQL"]
)

# ---------------- USERS TAB ----------------
with tab_users:
    st.subheader("Registered Users")
    df = load_table(
        "users",
        "id, name, identifier AS email, username, role, city, auth_method, created_at"
    )
    st.write(f"Total users: **{len(df)}**")

    col1, col2 = st.columns(2)
    with col1:
        role_filter = st.multiselect("Filter by role", options=df["role"].unique().tolist())
    with col2:
        city_filter = st.multiselect("Filter by city", options=df["city"].unique().tolist())

    filtered = df.copy()
    if role_filter:
        filtered = filtered[filtered["role"].isin(role_filter)]
    if city_filter:
        filtered = filtered[filtered["city"].isin(city_filter)]

    st.dataframe(filtered, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Delete a user")
    if not df.empty:
        del_id = st.selectbox("Select user ID to delete", options=df["id"].tolist(), key="del_user")
        if st.button("Delete user", type="primary"):
            run_query("DELETE FROM users WHERE id = ?", (del_id,))
            st.success(f"Deleted user {del_id}. Refresh to see changes.")
            st.rerun()

# ---------------- VENDORS TAB ----------------
with tab_vendors:
    st.subheader("Vendor Listings")
    df_v = load_table("vendors")
    st.write(f"Total vendors: **{len(df_v)}**")

    col1, col2 = st.columns(2)
    with col1:
        city_v_filter = st.multiselect("Filter by city", options=CITIES, key="v_city_filter")
    with col2:
        cat_v_filter = st.multiselect("Filter by category", options=CATEGORIES, key="v_cat_filter")

    filtered_v = df_v.copy()
    if city_v_filter:
        filtered_v = filtered_v[filtered_v["city"].isin(city_v_filter)]
    if cat_v_filter:
        filtered_v = filtered_v[filtered_v["category"].isin(cat_v_filter)]

    st.dataframe(filtered_v, use_container_width=True, hide_index=True)

    st.divider()
    add_col, edit_col, del_col = st.columns(3)

    # ---- ADD VENDOR ----
    with add_col:
        st.markdown("### ➕ Add vendor")
        with st.form("add_vendor_form", clear_on_submit=True):
            name = st.text_input("Name")
            category = st.selectbox("Category", CATEGORIES)
            city = st.selectbox("City", CITIES)
            area = st.text_input("Area")
            price = st.number_input("Price (₹)", min_value=0, value=300, step=10)
            rating = st.number_input("Rating", min_value=0.0, max_value=5.0, value=4.2, step=0.1)
            response_minutes = st.number_input("Response time (minutes)", min_value=1, value=30)
            distance_km = st.number_input("Distance (km)", min_value=0.0, value=3.0, step=0.1)
            phone = st.text_input("Phone", value="9999999999")
            description = st.text_area("Description")
            verified = st.checkbox("Verified", value=False)
            submitted = st.form_submit_button("Add vendor")

            if submitted:
                if not name or not area:
                    st.error("Name and area are required.")
                else:
                    run_query(
                        """INSERT INTO vendors
                        (owner_user_id, name, category, city, area, price, rating, response_minutes, distance_km, phone, description, verified, created_at)
                        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (name, category, city, area, int(price), float(rating), int(response_minutes),
                         float(distance_km), phone, description, int(verified), now_iso()),
                    )
                    st.success(f"Added vendor '{name}'.")
                    st.rerun()

    # ---- EDIT VENDOR ----
    with edit_col:
        st.markdown("### ✏️ Edit vendor")
        if not df_v.empty:
            edit_id = st.selectbox("Select vendor ID", options=df_v["id"].tolist(), key="edit_vendor_id")
            vendor_row = df_v[df_v["id"] == edit_id].iloc[0]

            with st.form("edit_vendor_form"):
                e_name = st.text_input("Name", value=vendor_row["name"])
                e_category = st.selectbox("Category", CATEGORIES, index=CATEGORIES.index(vendor_row["category"]) if vendor_row["category"] in CATEGORIES else 0)
                e_city = st.selectbox("City", CITIES, index=CITIES.index(vendor_row["city"]) if vendor_row["city"] in CITIES else 0)
                e_area = st.text_input("Area", value=vendor_row["area"])
                e_price = st.number_input("Price (₹)", min_value=0, value=int(vendor_row["price"]))
                e_rating = st.number_input("Rating", min_value=0.0, max_value=5.0, value=float(vendor_row["rating"]), step=0.1)
                e_response = st.number_input("Response time (minutes)", min_value=1, value=int(vendor_row["response_minutes"]))
                e_distance = st.number_input("Distance (km)", min_value=0.0, value=float(vendor_row["distance_km"]), step=0.1)
                e_phone = st.text_input("Phone", value=vendor_row["phone"] or "")
                e_description = st.text_area("Description", value=vendor_row["description"] or "")
                e_verified = st.checkbox("Verified", value=bool(vendor_row["verified"]))
                update_submitted = st.form_submit_button("Save changes")

                if update_submitted:
                    run_query(
                        """UPDATE vendors SET name=?, category=?, city=?, area=?, price=?, rating=?,
                        response_minutes=?, distance_km=?, phone=?, description=?, verified=? WHERE id=?""",
                        (e_name, e_category, e_city, e_area, int(e_price), float(e_rating), int(e_response),
                         float(e_distance), e_phone, e_description, int(e_verified), int(edit_id)),
                    )
                    st.success(f"Updated vendor {edit_id}.")
                    st.rerun()
        else:
            st.info("No vendors to edit yet.")

    # ---- DELETE VENDOR ----
    with del_col:
        st.markdown("### 🗑️ Delete vendor")
        if not df_v.empty:
            del_v_id = st.selectbox("Select vendor ID to delete", options=df_v["id"].tolist(), key="del_vendor_id")
            del_v_name = df_v[df_v["id"] == del_v_id].iloc[0]["name"]
            st.write(f"About to delete: **{del_v_name}**")
            if st.button("Delete vendor", type="primary"):
                run_query("DELETE FROM vendors WHERE id = ?", (del_v_id,))
                st.success(f"Deleted vendor {del_v_id}.")
                st.rerun()
        else:
            st.info("No vendors to delete yet.")

# ---------------- BOOKINGS TAB ----------------
with tab_bookings:
    st.subheader("Bookings")
    df_b = load_table("bookings")
    st.write(f"Total bookings: **{len(df_b)}**")
    status_filter = st.multiselect("Filter by status", options=df_b["status"].unique().tolist() if not df_b.empty else [])
    filtered_b = df_b[df_b["status"].isin(status_filter)] if status_filter else df_b
    st.dataframe(filtered_b, use_container_width=True, hide_index=True)

# ---------------- CUSTOM SQL TAB ----------------
with tab_sql:
    st.subheader("Run a custom SQL query (read-only recommended)")
    st.caption("Example: SELECT * FROM vendors WHERE city = 'Kanpur'")
    query = st.text_area("SQL query", value="SELECT * FROM vendors LIMIT 20;", height=100)
    if st.button("Run query"):
        try:
            with get_conn() as conn:
                result = pd.read_sql_query(query, conn)
            st.dataframe(result, use_container_width=True, hide_index=True)
        except Exception as e:
            st.error(f"Query failed: {e}")
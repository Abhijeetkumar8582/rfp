"use client";
import React from "react";
import AppShell from "../components/AppShell";
import "../css/dashboard.css";

const statsTabs = [
  { title: "Active RFPs", subtitle: "In Progress" },
  { title: "In Review", subtitle: "Pending" },
  { title: "Submitted", subtitle: "This Month" },
  { title: "Draft", subtitle: "Saved" },
  { title: "Completed", subtitle: "Closed" },
];

const tableRows = [
  {
    id: 1,
    name: "RFP-1298",
    type: "Request",
    cat: "Procurement",
    sku: "RFP-1298",
    price: "—",
    qty: "—",
    channel: "Open",
    status: "In Review",
    source: "Internal",
  },
  {
    id: 2,
    name: "RFP-1297",
    type: "Request",
    cat: "Services",
    sku: "RFP-1297",
    price: "—",
    qty: "—",
    channel: "Open",
    status: "Draft",
    source: "Internal",
  },
  {
    id: 3,
    name: "RFP-1296",
    type: "Request",
    cat: "Procurement",
    sku: "RFP-1296",
    price: "—",
    qty: "—",
    channel: "Closed",
    status: "Approved",
    source: "Internal",
  },
  {
    id: 4,
    name: "RFP-1295",
    type: "Request",
    cat: "Vendor",
    sku: "RFP-1295",
    price: "—",
    qty: "—",
    channel: "Open",
    status: "Submitted",
    source: "Internal",
  },
  {
    id: 5,
    name: "RFP-1294",
    type: "Request",
    cat: "Procurement",
    sku: "RFP-1294",
    price: "—",
    qty: "—",
    channel: "Closed",
    status: "Completed",
    source: "Internal",
  },
];

export default function Dashboard() {
  return (
    <AppShell>
      <>
        {/* Header */}
        <header className="headerRow">
          <div>
            <h1 className="pageTitle">RFP Dashboard</h1>
            <div className="pageSub">Request for Proposal overview</div>
          </div>

          <div className="rangeSwitch">
            <button className="rangeBtn">Last 7 days</button>
            <button className="rangeBtn rangeBtnActive">Last 28 days</button>
            <button className="rangeBtn">This month</button>
          </div>
        </header>

        {/* Top cards */}
        <section className="topCards">
          {statsTabs.map((t) => (
            <div key={t.title} className="miniCard">
              <div className="miniCardTop">
                <div className="miniCardTitle">{t.title}</div>
                <button className="kebab" aria-label="menu">
                  ⋯
                </button>
              </div>
              <div className="miniCardSub">{t.subtitle}</div>
            </div>
          ))}
        </section>

        {/* Search + actions */}
        <section className="actionsRow">
          <div className="searchWrap">
            <span className="searchIcon">🔎</span>
            <input
              className="searchInput"
              placeholder="Search RFPs..."
            />
          </div>

          <div className="actionsRight">
            <button className="ghostBtn">
              <span className="btnIcon">⚲</span> Filters
            </button>
            <button className="ghostBtn">
              <span className="btnIcon">⤓</span> Attachment
            </button>
          </div>
        </section>

        {/* Filter chips row */}
        <section className="filtersRow">
          {["Order", "Sales", "Taxes", "Active product", "Categories", "Out of stock"].map(
            (x) => (
              <button key={x} className="chip">
                {x} <span className="chipCaret">▾</span>
              </button>
            )
          )}
        </section>

        {/* Chart + Right widget */}
        <section className="grid2">
          <div className="panel">
            <div className="panelHeader">
              <div>
                <div className="panelTitle">Performance</div>
                <div className="panelSub">Statistics Sales</div>
              </div>

              <div className="panelControls">
                <button className="chip chipSmall">
                  Monthly <span className="chipCaret">▾</span>
                </button>
                <button className="chip chipSmall">
                  This years <span className="chipCaret">▾</span>
                </button>
              </div>
            </div>

            {/* Fake chart (SVG) */}
            <div className="chartBox">
              <svg
                className="chartSvg"
                viewBox="0 0 900 260"
                preserveAspectRatio="none"
              >
                {/* grid */}
                {[...Array(6)].map((_, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={20 + i * 40}
                    x2="900"
                    y2={20 + i * 40}
                    className="gridLine"
                  />
                ))}
                {/* lines */}
                <path
                  d="M0,210 C120,110 180,170 260,140 C360,95 420,120 520,80 C620,45 700,90 780,70 C830,55 860,40 900,20"
                  className="lineA"
                />
                <path
                  d="M0,230 C110,160 200,210 290,175 C360,150 440,165 540,135 C640,120 720,135 800,110 C840,95 870,90 900,55"
                  className="lineB"
                />
                <path
                  d="M0,240 C120,190 200,235 280,210 C350,195 440,210 520,180 C640,165 720,160 820,130 C860,120 880,115 900,85"
                  className="lineC"
                />
              </svg>

              <div className="chartAxis">
                <span>Jan 12</span>
                <span>Feb 23</span>
                <span>Mar 14</span>
                <span>Apr 29</span>
                <span>May 17</span>
                <span>Jun 9</span>
                <span>Jul 24</span>
                <span>Aug 25</span>
                <span>Sep 2</span>
                <span>Oct 10</span>
                <span>Nov 10</span>
                <span>Dec 21</span>
              </div>
            </div>
          </div>

          <div className="panel dotted">
            <div className="panelHeader">
              <div className="panelTitle">Out of stock</div>
              <button className="kebab" aria-label="menu">
                ⋯
              </button>
            </div>

            <div className="notice">
              <div className="noticeTitle">There is a problem with order</div>
              <div className="noticeText">
                Unfortunately, there are no longer enough stocks of the following
                items as you placed and the items have been removed as required.
              </div>

              <div className="miniTable">
                <div className="miniTableHead">
                  <span>Product</span>
                  <span>Previous Qty</span>
                  <span>New Qty</span>
                </div>
                <div className="miniTableRow">
                  <span>Dressing Table and Chair</span>
                  <span>1</span>
                  <span>0</span>
                </div>
              </div>

              <div className="ctaBox">
                <div className="ctaIcon">＋</div>
                <div className="ctaText">
                  Please add your favorite product <br />
                  <a href="#browse" onClick={(e) => e.preventDefault()}>
                    click to browse
                  </a>
                </div>
              </div>

              <div className="ctaRow">
                <button className="ghostBtn">Back to Shop</button>
                <button className="primaryBtn">Continue</button>
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="panel tablePanel">
          <div className="tableHeader">
            <div className="tableTitle">Recent RFPs</div>
            <div className="tableControls">
              <button className="chip chipSmall">
                Action Products <span className="chipCaret">▾</span>
              </button>
              <button className="chip chipSmall">
                100 <span className="chipCaret">▾</span>
              </button>
              <div className="pager">
                <button className="pagerBtn" aria-label="prev">
                  ‹
                </button>
                <button className="pagerBtn" aria-label="next">
                  ›
                </button>
              </div>
            </div>
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="wCheck"></th>
                  <th className="wId">#</th>
                  <th>RFP / Name</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Ref</th>
                  <th>—</th>
                  <th>—</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th className="wEdit"></th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="wCheck">
                      <input type="checkbox" defaultChecked={idx === 0 || idx === 3} />
                    </td>
                    <td className="wId">{r.id}</td>
                    <td className="prodCell">
                      <div className="prodIcon" />
                      <div className="prodName">{r.name}</div>
                    </td>
                    <td>{r.type}</td>
                    <td>{r.cat}</td>
                    <td>{r.sku}</td>
                    <td>{r.price}</td>
                    <td>{r.qty}</td>
                    <td>{r.channel}</td>
                    <td>
                      <span className="pill">{r.status}</span>
                    </td>
                    <td>{r.source}</td>
                    <td className="wEdit">
                      <button className="linkBtn">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    </AppShell>
  );
}

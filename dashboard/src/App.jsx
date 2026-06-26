import { useState, useEffect } from "react"

const API_URL = "http://127.0.0.1:8000"

const STATUS_COLORS = {
  queued: "#f59e0b",
  running: "#3b82f6",
  done: "#22c55e",
  failed: "#ef4444",
}

function JobCard({ job }) {
  return (
    <div style={{
      background: "#1e1e2e",
      border: "1px solid #313244",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ color: "#cdd6f4", fontWeight: "bold", fontSize: "16px" }}>
            #{job.id} — {job.type}
          </span>
          <span style={{
            marginLeft: "12px",
            padding: "2px 10px",
            borderRadius: "999px",
            background: STATUS_COLORS[job.status] + "22",
            color: STATUS_COLORS[job.status],
            fontSize: "13px",
            fontWeight: "bold",
          }}>
            {job.status.toUpperCase()}
          </span>
        </div>
        <span style={{ color: "#6c7086", fontSize: "12px" }}>
          Retries: {job.retries}
        </span>
      </div>

      {job.result && (
        <p style={{ color: "#a6e3a1", marginTop: "8px", fontSize: "14px" }}>
          ✅ {job.result}
        </p>
      )}
      {job.error && (
        <p style={{ color: "#f38ba8", marginTop: "8px", fontSize: "14px" }}>
          ❌ {job.error}
        </p>
      )}
      <p style={{ color: "#6c7086", fontSize: "12px", marginTop: "8px" }}>
        Created: {new Date(job.created_at).toLocaleString()}
      </p>
    </div>
  )
}

function SubmitJob({ onSubmit }) {
  const [type, setType] = useState("send_email")
  const [payload, setPayload] = useState('{"to": "user@example.com"}')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload: JSON.parse(payload) }),
      })
      const data = await res.json()
      onSubmit(data)
    } catch (e) {
      alert("Error submitting job: " + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: "#1e1e2e",
      border: "1px solid #313244",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "24px",
    }}>
      <h2 style={{ color: "#cdd6f4", marginBottom: "16px" }}>Submit a Job</h2>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ color: "#a6adc8", fontSize: "14px" }}>Job Type</label>
        <select
          value={type}
          onChange={e => {
            setType(e.target.value)
            if (e.target.value === "send_email") setPayload('{"to": "user@example.com"}')
            if (e.target.value === "resize_image") setPayload('{"filename": "photo.jpg", "size": "1920x1080"}')
            if (e.target.value === "generate_report") setPayload('{"user": "sarthki"}')
          }}
          style={{
            display: "block", width: "100%", marginTop: "6px",
            background: "#313244", color: "#cdd6f4", border: "1px solid #45475a",
            borderRadius: "6px", padding: "8px", fontSize: "14px",
          }}
        >
          <option value="send_email">send_email</option>
          <option value="resize_image">resize_image</option>
          <option value="generate_report">generate_report</option>
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ color: "#a6adc8", fontSize: "14px" }}>Payload (JSON)</label>
        <textarea
          value={payload}
          onChange={e => setPayload(e.target.value)}
          rows={3}
          style={{
            display: "block", width: "100%", marginTop: "6px",
            background: "#313244", color: "#cdd6f4", border: "1px solid #45475a",
            borderRadius: "6px", padding: "8px", fontSize: "14px",
            fontFamily: "monospace", boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          background: "#89b4fa", color: "#1e1e2e", border: "none",
          borderRadius: "6px", padding: "10px 20px", fontWeight: "bold",
          fontSize: "14px", cursor: "pointer",
        }}
      >
        {loading ? "Submitting..." : "Submit Job"}
      </button>
    </div>
  )
}

export default function App() {
  const [jobs, setJobs] = useState([])

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`)
      const data = await res.json()
      setJobs(data)
    } catch (e) {
      console.error("Failed to fetch jobs", e)
    }
  }

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 3000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === "queued").length,
    running: jobs.filter(j => j.status === "running").length,
    done: jobs.filter(j => j.status === "done").length,
    failed: jobs.filter(j => j.status === "failed").length,
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#181825",
      color: "#cdd6f4", fontFamily: "Inter, sans-serif", padding: "32px",
    }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>
        Task Queue Dashboard
      </h1>
      <p style={{ color: "#6c7086", marginBottom: "32px" }}>
        Live updates every 3 seconds
      </p>

      <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
        {[
          { label: "Total", value: stats.total, color: "#cdd6f4" },
          { label: "Queued", value: stats.queued, color: "#f59e0b" },
          { label: "Running", value: stats.running, color: "#3b82f6" },
          { label: "Done", value: stats.done, color: "#22c55e" },
          { label: "Failed", value: stats.failed, color: "#ef4444" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#1e1e2e", border: "1px solid #313244",
            borderRadius: "8px", padding: "16px 24px", minWidth: "100px",
          }}>
            <div style={{ color: stat.color, fontSize: "28px", fontWeight: "bold" }}>
              {stat.value}
            </div>
            <div style={{ color: "#6c7086", fontSize: "13px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <SubmitJob onSubmit={fetchJobs} />

      <h2 style={{ color: "#cdd6f4", marginBottom: "16px" }}>All Jobs</h2>
      {jobs.length === 0
        ? <p style={{ color: "#6c7086" }}>No jobs yet. Submit one above.</p>
        : jobs.map(job => <JobCard key={job.id} job={job} />)
      }
    </div>
  )
}
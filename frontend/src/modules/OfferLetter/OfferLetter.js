import React, { useState } from 'react';
import './OfferLetter.css';
import axios from 'axios';

function OfferLetter() {

  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [internType, setInternType] = useState("");
  const [durationType, setDurationType] = useState("");
  const [duration, setDuration] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salaryType, setSalaryType] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfPath, setPdfPath] = useState("");

  async function generateOfferLetter() {
    try {
      setLoading(true);
      setError("");

      const response = await axios.post('http://localhost:5000/api/offerletter/generate', {
        name,
        gender,
        internType,
        durationType,
        duration,
        role,
        startDate,
        endDate,
        salaryType,
        salaryAmount
      });

      console.log(response.data);

      setPdfPath(response.data.path);

      alert(`Offer letter generated successfully!`);

    } catch (err) {
      console.error('Error generating offer letter:', err);
      setError('Failed to generate offer letter. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openFilePath() {

    if (!pdfPath) {
      alert("Generate offer letter first");
      return;
    }

    window.open(pdfPath, "_blank");
  }

  return (
    <div className="OfferLetter">
      <h2>Offer Letter Generator</h2>

      <input type="text" placeholder='name' value={name} onChange={(e) => setName(e.target.value)} />
      <br></br><input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} /> male
      <input type="radio" name="gender" value="female" checked={gender === "female"} onChange={() => setGender("female")} /> female

      <br></br><input type="radio" name="typejob" value="internship" checked={internType === "internship"} onChange={() => setInternType("internship")} /> internship
      <input type="radio" name="typejob" value="part time" checked={internType === "part time"} onChange={() => setInternType("part time")} /> part_time
      <input type="radio" name="typejob" value="full time" checked={internType === "full time"} onChange={() => setInternType("full time")} /> full_time

      <br></br><input type="radio" name="duration" value="month" checked={durationType === "month"} onChange={() => setDurationType("month")} /> month
      <input type="radio" name="duration" value="year" checked={durationType === "year"} onChange={() => setDurationType("year")} /> year

      <br></br><input type="number" placeholder='duration (e.g. 2)' value={duration} onChange={(e) => setDuration(e.target.value)} />
      <br></br><input type="text" placeholder='role' value={role} onChange={(e) => setRole(e.target.value)} />
      <br></br><input type="date" placeholder='startDate' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <br></br><input type="date" placeholder='endDate' value={endDate} onChange={(e) => setEndDate(e.target.value)} />

      <br></br><input type="radio" name="salary" value="paid" checked={salaryType === "paid"} onChange={() => setSalaryType("paid")} /> paid
      <input type="radio" name="salary" value="unpaid" checked={salaryType === "unpaid"} onChange={() => setSalaryType("unpaid")} /> unpaid

      <br></br>{salaryType === "paid" && (
        <input type="text" placeholder='Enter salary amount' value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
      )}

      {error && <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>}

      <button onClick={() => generateOfferLetter()} disabled={loading}>
        {loading ? 'Generating Offer Letter...' : 'Generate Offer Letter'}
      </button>

      <button onClick={() => openFilePath()}>
        open file path
      </button>

    </div >
  );
}

export default OfferLetter;
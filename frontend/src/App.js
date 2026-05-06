import React, { useEffect, useReducer, useState, useId, useRef } from 'react';
import './App.css';
import axios from 'axios';
import generatePDF from './pdf';




function App() {

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

  function getLetter() {
    generatePDF({
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
  }

  return (
    <div className="App">
      <input type="text" placeholder='name' value={name} onChange={(e) => setName(e.target.value)} />
      <br></br><input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} /> male
      <input type="radio" name="gender" value="female" checked={gender === "female"} onChange={() => setGender("female")} /> female

      <br></br><input type="radio" name="typejob" value="internship" checked={internType === "internship"} onChange={() => setInternType("internship")} /> internship
      <br></br><input type="radio" name="typejob" value="part time" checked={internType === "part time"} onChange={() => setInternType("part time")} /> part_time
      <br></br><input type="radio" name="typejob" value="full time" checked={internType === "full time"} onChange={() => setInternType("full time")} /> full_time

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

      <button onClick={() => getLetter()}>pdf</button>
    </div >
  );
}

export default App;

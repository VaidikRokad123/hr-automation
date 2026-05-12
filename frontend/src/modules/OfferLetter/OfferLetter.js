import React, { useState } from 'react';
import './OfferLetter.css';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

function OfferLetter() {
  const navigate = useNavigate();

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
  const [contractLoading, setContractLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfPath, setPdfPath] = useState("");
  const [showNotification, setShowNotification] = useState(false);

  function buildRequestPayload() {
    return {
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
    };
  }

  async function generateOfferLetter() {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.post('/api/offerletter/generate', buildRequestPayload());

      console.log(response.data);

      setPdfPath(response.data.path);

      // Show notification
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

    } catch (err) {
      console.error('Error generating offer letter:', err);
      setError('Failed to generate offer letter. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function generateContract() {
    try {
      setContractLoading(true);
      setError("");

      const response = await apiClient.post('/api/contracts/template', buildRequestPayload());
      const contractData = response.data.data;

      navigate('/advanced-editor', {
        state: {
          mode: 'contract',
          pages: contractData.pages,
          metadata: contractData.metadata
        }
      });
    } catch (err) {
      console.error('Error generating contract:', err);
      setError(err.response?.data?.message || 'Failed to generate contract. Please try again.');
    } finally {
      setContractLoading(false);
    }
  }

  function downloadPDF() {
    if (!pdfPath) {
      setError("Generate offer letter first");
      return;
    }

    // Open PDF in new tab
    window.open(pdfPath, "_blank");
  }

  function openAdvancedEditor() {
    if (!pdfPath) {
      setError("Generate offer letter first before editing");
      return;
    }

    navigate('/advanced-editor', { state: { pdfUrl: pdfPath } });
  }

  return (
    <div className="OfferLetterContainer page-grid">
      {showNotification && (
        <div className="notification-popup">
          ✓ Offer letter generated successfully!
        </div>
      )}

      <div className="FormSection page-card form-stack">
        <h2>Offer Letter Generator</h2>

        <div className="form-group form-field">
          <label>Name</label>
          <input className="form-control" type="text" placeholder='Enter name' value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="form-group form-field">
          <label>Gender</label>
          <div className="radio-group">
            <label>
              <input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} />
              Male
            </label>
            <label>
              <input type="radio" name="gender" value="female" checked={gender === "female"} onChange={() => setGender("female")} />
              Female
            </label>
          </div>
        </div>

        <div className="form-group form-field">
          <label>Job Type</label>
          <div className="radio-group">
            <label>
              <input type="radio" name="typejob" value="internship" checked={internType === "internship"} onChange={() => setInternType("internship")} />
              Internship
            </label>
            <label>
              <input type="radio" name="typejob" value="part time" checked={internType === "part time"} onChange={() => setInternType("part time")} />
              Part Time
            </label>
            <label>
              <input type="radio" name="typejob" value="full time" checked={internType === "full time"} onChange={() => setInternType("full time")} />
              Full Time
            </label>
          </div>
        </div>

        <div className="form-group form-field">
          <label>Duration Type</label>
          <div className="radio-group">
            <label>
              <input type="radio" name="duration" value="month" checked={durationType === "month"} onChange={() => setDurationType("month")} />
              Month
            </label>
            <label>
              <input type="radio" name="duration" value="year" checked={durationType === "year"} onChange={() => setDurationType("year")} />
              Year
            </label>
          </div>
        </div>

        <div className="form-group form-field">
          <label>Duration</label>
          <input className="form-control" type="number" placeholder='e.g. 2' value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>

        <div className="form-group form-field">
          <label>Role</label>
          <input className="form-control" type="text" placeholder='Enter role' value={role} onChange={(e) => setRole(e.target.value)} />
        </div>

        <div className="form-group form-field">
          <label>Start Date</label>
          <input className="form-control" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="form-group form-field">
          <label>End Date</label>
          <input className="form-control" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="form-group form-field">
          <label>Salary Type</label>
          <div className="radio-group">
            <label>
              <input type="radio" name="salary" value="paid" checked={salaryType === "paid"} onChange={() => setSalaryType("paid")} />
              Paid
            </label>
            <label>
              <input type="radio" name="salary" value="unpaid" checked={salaryType === "unpaid"} onChange={() => setSalaryType("unpaid")} />
              Unpaid
            </label>
          </div>
        </div>

        {salaryType === "paid" && (
          <div className="form-group form-field">
            <label>Salary Amount</label>
            <input className="form-control" type="text" placeholder='Enter salary amount' value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} />
          </div>
        )}

        {error && <div className="page-error">{error}</div>}

        <button onClick={() => generateOfferLetter()} disabled={loading} className="page-button generate-btn">
          {loading ? 'Generating...' : 'Generate Offer Letter'}
        </button>

        <button onClick={() => generateContract()} disabled={contractLoading} className="page-button-secondary generate-btn">
          {contractLoading ? 'Generating Contract...' : 'Generate Contract'}
        </button>

        <button onClick={() => openAdvancedEditor()} className="page-button-secondary advanced-btn">
          Advanced Edit
        </button>

        <button onClick={() => downloadPDF()} className="page-button-secondary download-btn">
          Download PDF
        </button>
      </div>

      <div className="PreviewSection page-card">
        <h2>PDF Preview</h2>
        {pdfPath ? (
          <iframe
            src={pdfPath}
            title="Offer Letter Preview"
            className="pdf-viewer"
          />
        ) : (
          <div className="no-preview">
            <p>No PDF generated yet</p>
            <p>Fill in the form and click "Generate Offer Letter" to see the preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfferLetter;

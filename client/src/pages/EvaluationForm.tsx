import { useState, useEffect } from 'react';

interface InternOption {
  intern_id: string;
  p_no: string;
  full_name: string;
  status: string;
}

export default function EvaluationForm() {
  const [interns, setInterns] = useState<InternOption[]>([]);
  const [form, setForm] = useState({
    review_id: '',
    presenter_id: '',
    presenter_name: '',
    evaluator_id: '',
    is_hr: false,
    technical: 0,
    communication: 0,
    confidence: 0,
    understanding: 0,
    problem_solving: 0,
    innovation: 0,
    documentation: 0,
    qa_handling: 0,
    presentation: 0,
    overall: 0
  });

  useEffect(() => {
    async function loadInterns() {
      try {
        const res = await fetch('/api/interns');
        if (res.ok) {
          const data = await res.json();
          setInterns(data);
        }
      } catch (err) {
        console.error('Failed to load interns:', err);
      }
    }
    loadInterns();
  }, []);

  const [totalScore, setTotalScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const criteria = [
    { key: 'technical', label: 'Technical Skills', icon: '⚙️' },
    { key: 'communication', label: 'Communication', icon: '💬' },
    { key: 'confidence', label: 'Confidence', icon: '💪' },
    { key: 'understanding', label: 'Understanding', icon: '🧠' },
    { key: 'problem_solving', label: 'Problem Solving', icon: '🔍' },
    { key: 'innovation', label: 'Innovation', icon: '💡' },
    { key: 'documentation', label: 'Documentation', icon: '📄' },
    { key: 'qa_handling', label: 'Q&A Handling', icon: '❓' },
    { key: 'presentation', label: 'Presentation', icon: '🎤' },
    { key: 'overall', label: 'Overall Performance', icon: '⭐' }
  ];

  const handleScoreChange = (key: string, value: number) => {
    const updatedForm = {
      ...form,
      [key]: Math.min(10, Math.max(0, value))
    };
    setForm(updatedForm);

    const newTotal = criteria.reduce((sum, c) => {
      return sum + (updatedForm[c.key as keyof typeof updatedForm] as number || 0);
    }, 0);
    setTotalScore(newTotal);
  };

  async function submitEvaluation() {
    if (!form.review_id || !form.presenter_id || !form.evaluator_id) {
      alert('Please fill in Review ID, Presenter ID, and Evaluator ID');
      return;
    }

    if (totalScore === 0) {
      alert('Please provide scores for evaluation');
      return;
    }

    try {
      const response = await fetch(
        '/api/Project-review/evaluation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...form,
            total_marks: totalScore
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit evaluation');
      }

      const data = await response.json();
      setSubmitted(true);
      setTimeout(() => {
        alert('✅ Evaluation Submitted Successfully');
        setForm({
          review_id: '',
          presenter_id: '',
          presenter_name: '',
          evaluator_id: '',
          is_hr: false,
          technical: 0,
          communication: 0,
          confidence: 0,
          understanding: 0,
          problem_solving: 0,
          innovation: 0,
          documentation: 0,
          qa_handling: 0,
          presentation: 0,
          overall: 0
        });
        setTotalScore(0);
        setSubmitted(false);
      }, 1000);
      console.log(data);
    } catch (error) {
      alert('❌ Error submitting evaluation');
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📝 Submit Evaluation
          </h1>
          <p className="text-gray-600">
            Evaluate the presenter's performance across 10 criteria (0-10 points each)
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
          <p className="text-sm text-blue-900">
            <strong>📌 Scoring Note:</strong> Your evaluation will be compared against HR's evaluation.
            Scores within ±5 of HR's score receive no penalty. Scores beyond this range incur analytical skill penalties.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Batch Info Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Batch Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Review ID *"
                  className="border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  value={form.review_id}
                  onChange={(e) =>
                    setForm({ ...form, review_id: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Evaluator ID *"
                  className="border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:border-blue-500"
                  value={form.evaluator_id}
                  onChange={(e) =>
                    setForm({ ...form, evaluator_id: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Presenter Info Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Presenter Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 mb-1.5">Select Presenter *</label>
                  <select
                    className="border-2 border-gray-300 rounded-lg p-3 bg-white focus:outline-none focus:border-blue-500 text-sm font-medium"
                    value={form.presenter_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedIntern = interns.find(i => i.intern_id === selectedId);
                      setForm({
                        ...form,
                        presenter_id: selectedId,
                        presenter_name: selectedIntern ? selectedIntern.full_name : ''
                      });
                    }}
                  >
                    <option value="">-- Choose Intern --</option>
                    {interns
                      .filter(i => ['Applied', 'Matched', 'Assigned', 'Ongoing', 'Completed'].includes(i.status || ''))
                      .map(i => (
                        <option key={i.intern_id} value={i.intern_id}>
                          {i.full_name} ({i.p_no})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 mb-1.5">Presenter Name</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Presenter Name"
                    className="border-2 border-gray-200 bg-gray-50 rounded-lg p-3 text-gray-500 font-medium text-sm"
                    value={form.presenter_name}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_hr}
                    onChange={(e) =>
                      setForm({ ...form, is_hr: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-gray-700 font-medium">
                    🎯 I am the HR evaluator for this presentation
                  </span>
                </label>
              </div>
            </div>

            {/* Scoring Criteria */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Evaluation Criteria</h2>
              <p className="text-sm text-gray-600 mb-4">
                Rate the presenter on each criterion (0-10 points)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {criteria.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={Number(form[item.key as keyof typeof form] || 0)}
                          onChange={(e) =>
                            handleScoreChange(item.key, Number(e.target.value))
                          }
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={Number(form[item.key as keyof typeof form] || 0)}
                          onChange={(e) =>
                            handleScoreChange(item.key, Number(e.target.value))
                          }
                          className="w-12 border border-gray-300 rounded px-2 py-1 text-center text-sm font-semibold text-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-lg shadow-lg p-6 sticky top-20">
              <h3 className="text-lg font-bold mb-4">Score Summary</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-100">Total Score:</span>
                  <span className="text-3xl font-bold">{totalScore}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-100">Maximum:</span>
                  <span className="font-semibold">100</span>
                </div>
                <div className="w-full bg-indigo-800 rounded-full h-2 mt-4">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((totalScore / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-indigo-900 bg-opacity-50 rounded-lg p-4 mb-6">
                <p className="text-xs text-indigo-200 mb-2">Criteria Breakdown:</p>
                <div className="text-sm space-y-1">
                  {criteria.map((item) => (
                    <div key={item.key} className="flex justify-between">
                      <span className="text-indigo-100">{item.icon} {item.label}:</span>
                      <span className="font-semibold">
                        {form[item.key as keyof typeof form] || 0}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={submitEvaluation}
                disabled={submitted || totalScore === 0}
                className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all duration-200 ${
                  submitted
                    ? 'bg-green-500 text-white'
                    : totalScore === 0
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                }`}
              >
                {submitted ? '✅ Submitted' : 'Submit Evaluation'}
              </button>

              <p className="text-xs text-indigo-200 mt-4 text-center">
                {totalScore === 0
                  ? 'Please fill in the scores above'
                  : `Ready to submit ${totalScore} points`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
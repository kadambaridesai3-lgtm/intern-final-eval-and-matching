import { useEffect, useState } from 'react';

export default function PresentationsList() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const res = await fetch(
      '/api/Project-review'
    );

    const data = await res.json();
    setReviews(data);
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Saved Presentations
      </h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Review ID</th>
            <th>Title</th>
            <th>Batch</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {reviews.map((review: any) => (
            <tr key={review.id}>
              <td>{review.id}</td>
              <td>{review.title}</td>
              <td>{review.batch_name}</td>
              <td>
                {new Date(
                  review.review_date
                ).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
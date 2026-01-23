import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../../config/api";

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(
          API_ENDPOINTS.EVENT_DETAIL_BY_ID(id)
        );
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message);
        }

        setEvent(data.event);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>{event.title}</h1>

      <p><b>Category:</b> {event.category}</p>

      {/* description is markdown */}
      <div dangerouslySetInnerHTML={{ __html: event.description }} />

      {/* tags */}
      {event.tags && (
        <div>
          {event.tags.map((tag, i) => (
            <span key={i}>{tag}</span>
          ))}
        </div>
      )}

      {/* additional info */}
      {event.additional_info && (
        <pre>
          {JSON.stringify(event.additional_info, null, 2)}
        </pre>
      )}

      <p><b>Views:</b> {event.view_count}</p>
      <p><b>Created:</b> {new Date(event.created_at).toLocaleString()}</p>
    </div>
  );
};

export default EventDetail;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirect to home
    navigate("/");
  }, [navigate]);

  return null;
};

export default Logout;
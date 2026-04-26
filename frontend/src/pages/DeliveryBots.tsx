import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DeliveryBots: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/admin/fleet", { replace: true }); }, [navigate]);
  return null;
};

export default DeliveryBots;

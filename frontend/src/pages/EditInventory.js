import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const EditInventory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // For now, just redirect to preview
    // Full edit functionality can be added later
    toast.info("Edit functionality - redirecting to preview");
    navigate(`/preview/${id}`);
  }, [id, navigate]);

  return <div>Loading...</div>;
};

export default EditInventory;

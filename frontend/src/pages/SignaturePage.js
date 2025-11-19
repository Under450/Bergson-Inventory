import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BergasonLogo from "@/assets/bergason-logo.jpg";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignaturePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [simpleCheck, setSimpleCheck] = useState("");

  useEffect(() => {
    fetchInventory();
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/sign/${token}`);
      setInventory(response.data);
      
      if (response.data.signature && response.data.signature.is_locked) {
        toast.error("This document has already been signed");
        navigate(`/verify/${token}`);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Invalid or expired link");
      setLoading(false);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoordinates(e);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      setSignatureData(canvas.toDataURL());
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const submitSignature = async () => {
    if (!tenantName) {
      toast.error("Please enter your name");
      return;
    }
    
    if (!signatureData) {
      toast.error("Please provide your signature");
      return;
    }

    if (simpleCheck.toLowerCase() !== "agree") {
      toast.error("Please type 'agree' in the verification field");
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API}/sign/${token}/submit`, {
        tenant_name: tenantName,
        signature_data: signatureData,
        ip_address: ""
      });
      
      toast.success("Signature submitted successfully!");
      setTimeout(() => {
        navigate(`/verify/${token}`);
      }, 1500);
    } catch (error) {
      console.error("Error submitting signature:", error);
      toast.error(error.response?.data?.detail || "Failed to submit signature");
      setSubmitting(false);
    }
  };

  if (loading || !inventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">Loading document...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <header className="bg-black border-b-4 border-[#F5E6D3] shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center space-x-4">
            <img src={BergasonLogo} alt="Bergason" className="h-16 w-16 object-contain" />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#F5E6D3] logo-font">Inventory Report Signature</h1>
              <p className="text-[#F5E6D3]/80 text-sm">Bergason Property Services</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border-4 border-black p-8 shadow-2xl" data-testid="signature-section">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-black logo-font">Sign Document</h2>
          
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-2">Your Full Name *</Label>
              <Input
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Enter your full name"
                className="border-2 border-gray-300 focus:border-black text-lg py-6"
                data-testid="tenant-name-input"
              />
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2">Your Signature *</Label>
              <p className="text-sm text-gray-600 mb-3">Draw your signature in the box below</p>
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="signature-canvas w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                data-testid="signature-canvas"
              />
              <Button
                onClick={clearSignature}
                variant="outline"
                className="mt-3 border-2 border-gray-300"
                data-testid="clear-signature-btn"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Signature
              </Button>
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2">Verification *</Label>
              <p className="text-sm text-gray-600 mb-3">Type "agree" to confirm</p>
              <Input
                value={simpleCheck}
                onChange={(e) => setSimpleCheck(e.target.value)}
                placeholder="Type 'agree' here"
                className="border-2 border-gray-300 focus:border-black"
                data-testid="verification-input"
              />
            </div>

            <div className="flex justify-center">
              <Button
                onClick={submitSignature}
                disabled={submitting}
                className="bg-black text-[#F5E6D3] hover:bg-gray-800 px-12 py-6 text-xl font-bold"
                data-testid="submit-signature-btn"
              >
                <Check className="w-6 h-6 mr-3" />
                {submitting ? "Submitting..." : "Submit Signature"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturePage;

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import BergasonLogo from "@/assets/bergason-logo.jpg";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignaturePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantPresent, setTenantPresent] = useState(null);
  const [currentSignatures, setCurrentSignatures] = useState([]);
  
  // Current signature being added
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerRole, setSignerRole] = useState("Tenant");
  const [signatureData, setSignatureData] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const canvasRef = useRef(null);

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
      
      if (response.data.signature) {
        if (response.data.signature.is_locked) {
          toast.error("This document has already been locked");
          navigate(`/verify/${token}`);
          return;
        }
        setCurrentSignatures(response.data.signature.signatures || []);
        setTenantPresent(response.data.signature.tenant_present_during_inspection);
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
    
    // Ensure drawing context is properly configured
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
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
      const ctx = canvas.getContext('2d');
      
      // Check if canvas has actual drawing content (not blank)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasDrawing = imageData.data.some((channel, index) => {
        // Check alpha channel (every 4th value)
        return index % 4 === 3 && channel > 0;
      });
      
      if (hasDrawing) {
        setSignatureData(canvas.toDataURL());
      }
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const addSignature = async () => {
    if (!signerName) {
      toast.error("Please enter the signer's name");
      return;
    }
    
    if (!signatureData) {
      toast.error("Please provide a signature");
      return;
    }

    if (tenantPresent === null) {
      toast.error("Please specify if tenant was present during inspection");
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API}/sign/${token}/submit`, {
        signer_name: signerName,
        signer_role: signerRole,
        signature_data: signatureData,
        email: signerEmail,
        tenant_present: tenantPresent,
        ip_address: ""
      });
      
      toast.success("Signature added successfully!");
      
      // Refresh to show updated signatures
      await fetchInventory();
      
      // Reset form
      setSignerName("");
      setSignerEmail("");
      setSignerRole("Tenant");
      clearSignature();
      
      setSubmitting(false);
    } catch (error) {
      console.error("Error submitting signature:", error);
      toast.error(error.response?.data?.detail || "Failed to submit signature");
      setSubmitting(false);
    }
  };

  const lockDocument = async () => {
    if (currentSignatures.length === 0) {
      toast.error("Please add at least one signature before locking");
      return;
    }

    try {
      await axios.post(`${API}/sign/${token}/lock`);
      toast.success("Document locked successfully!");
      setTimeout(() => {
        navigate(`/verify/${token}`);
      }, 1500);
    } catch (error) {
      console.error("Error locking document:", error);
      toast.error(error.response?.data?.detail || "Failed to lock document");
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
        {/* Property Details */}
        <div className="bg-white border-2 border-black p-8 mb-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 logo-font">Property Inventory Report</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Property:</span>
              <p>{inventory.property_overview.address}</p>
            </div>
            <div>
              <span className="font-semibold">Inspection Date:</span>
              <p>{inventory.property_overview.inspection_date}</p>
            </div>
          </div>
        </div>

        {/* Tenant Presence Question */}
        <div className="bg-white border-2 border-black p-8 mb-8 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Declaration</h3>
          
          <div className="mb-6">
            <p className="font-semibold mb-3">Was the tenant present during the inspection?</p>
            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={() => setTenantPresent(true)}
                variant={tenantPresent === true ? "default" : "outline"}
                className={tenantPresent === true ? "bg-green-600 text-white" : ""}
                disabled={currentSignatures.length > 0}
              >
                YES
              </Button>
              <Button
                type="button"
                onClick={() => setTenantPresent(false)}
                variant={tenantPresent === false ? "default" : "outline"}
                className={tenantPresent === false ? "bg-red-600 text-white" : ""}
                disabled={currentSignatures.length > 0}
              >
                NO
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-600 p-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              I hereby confirm approval of the accuracy and contents of the information contained within this report and my responses (if/where provided). I have also read, understood and agree to the disclaimer information contained within this report. I hereby confirm that the test function button of any smoke and carbon monoxide alarms (where present) in my property are/were in working order (alarm sounds when pressed) at the start of my tenancy. I also understand that it is my responsibility to ensure that any smoke or carbon monoxide alarms are tested and batteries replaced (where required) during my tenancy. Furthermore, in the event any such alarm becomes faulty, I will inform my landlord or managing agent with immediate effect to arrange a replacement.
            </p>
          </div>
        </div>

        {/* Existing Signatures */}
        {currentSignatures.length > 0 && (
          <div className="bg-white border-2 border-green-600 p-8 mb-8 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-green-800">Collected Signatures ({currentSignatures.length})</h3>
            <div className="space-y-4">
              {currentSignatures.map((sig, index) => (
                <div key={index} className="border-2 border-gray-300 p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold">{sig.signer_name}</p>
                      <p className="text-sm text-gray-600">Role: {sig.signer_role}</p>
                      {sig.email && <p className="text-sm text-gray-600">Email: {sig.email}</p>}
                      <p className="text-sm text-gray-600">Signed: {new Date(sig.signed_at).toLocaleString()}</p>
                    </div>
                    <img src={sig.signature_data} alt="Signature" className="h-16 border-2 border-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Signature */}
        <div className="bg-white border-4 border-black p-8 shadow-2xl mb-8">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-black logo-font">
            {currentSignatures.length === 0 ? "Sign Document" : "Add Additional Signature"}
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-lg font-semibold mb-2">Full Name *</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Enter full name"
                  className="border-2 border-gray-300 focus:border-black"
                />
              </div>
              
              <div>
                <Label className="text-lg font-semibold mb-2">Role *</Label>
                <Select value={signerRole} onValueChange={setSignerRole}>
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inspector">Inspector</SelectItem>
                    <SelectItem value="Tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2">Email (Optional)</Label>
              <Input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="Enter email address"
                className="border-2 border-gray-300 focus:border-black"
              />
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2">Signature *</Label>
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
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <Button
                onClick={clearSignature}
                variant="outline"
                className="mt-3 border-2 border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Signature
              </Button>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={addSignature}
                disabled={submitting || !signerName || !signatureData || tenantPresent === null}
                className="bg-black text-[#F5E6D3] hover:bg-gray-800 px-8 py-4 text-lg font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                {submitting ? "Adding..." : "Add Signature"}
              </Button>
            </div>
          </div>
        </div>

        {/* Lock Document Button */}
        {currentSignatures.length > 0 && (
          <div className="bg-green-50 border-2 border-green-600 p-8 shadow-lg text-center">
            <h3 className="text-xl font-bold mb-4 text-green-800">Ready to Finalize?</h3>
            <p className="text-gray-700 mb-6">
              Once you lock this document, no more signatures can be added and the report becomes immutable.
            </p>
            <Button
              onClick={lockDocument}
              className="bg-green-600 text-white hover:bg-green-700 px-12 py-6 text-xl font-bold"
            >
              <Check className="w-6 h-6 mr-3" />
              Lock Document & Finalize
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignaturePage;

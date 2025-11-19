import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle, ExternalLink, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BergasonLogo from "@/assets/bergason-logo.jpg";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VerificationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verification, setVerification] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifySignature();
  }, [token]);

  const verifySignature = async () => {
    try {
      const verifyResponse = await axios.get(`${API}/verify/${token}`);
      setVerification(verifyResponse.data);
      
      const inventoryResponse = await axios.get(`${API}/sign/${token}`);
      setInventory(inventoryResponse.data);
      
      setLoading(false);
    } catch (error) {
      console.error("Error verifying signature:", error);
      toast.error("Failed to verify signature");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">Verifying signature...</div>
        </div>
      </div>
    );
  }

  if (!verification || !inventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">Unable to verify signature</div>
        </div>
      </div>
    );
  }

  const verificationLink = `${window.location.origin}/verify/${token}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <header className="bg-black border-b-4 border-[#F5E6D3] shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center space-x-4">
            <img src={BergasonLogo} alt="Bergason" className="h-16 w-16 object-contain" />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#F5E6D3] logo-font">Signature Verification</h1>
              <p className="text-[#F5E6D3]/80 text-sm">Bergason Property Services</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-green-50 border-4 border-green-600 p-8 mb-8 shadow-2xl" data-testid="verification-status">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-600 rounded-full p-6">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-center mb-4 text-green-800 logo-font">Document Verified</h2>
          <p className="text-center text-green-700 text-lg">
            This signature has been verified as authentic and the document is locked.
          </p>
        </div>

        <div className="bg-white border-2 border-black p-8 mb-8 shadow-lg">
          <div className="flex items-center mb-6">
            <Shield className="w-8 h-8 text-black mr-3" />
            <h3 className="text-2xl font-bold logo-font">Verification Details</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-gray-600">Signed By:</span>
              <p className="text-lg">{verification.signature.tenant_name}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Signed On:</span>
              <p className="text-lg">{new Date(verification.signature.signed_at).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Status:</span>
              <p className="text-lg">
                <span className="bg-green-100 text-green-800 px-3 py-1 font-semibold">LOCKED</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => navigate(`/preview/${inventory.id}`)}
            className="bg-black text-[#F5E6D3] hover:bg-gray-800 px-8 py-6 text-lg"
            data-testid="view-full-report-btn"
          >
            View Full Report
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-2 border-black px-8 py-6 text-lg"
            data-testid="download-verified-pdf-btn"
          >
            <Download className="w-5 h-5 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;

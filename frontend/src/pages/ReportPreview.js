import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Send, Download, Edit, ExternalLink, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import BergasonLogo from "@/assets/bergason-logo.jpg";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareableLink, setShareableLink] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const photoVaultRef = useRef(null);

  useEffect(() => {
    fetchInventory();
  }, [id]);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${API}/inventories/${id}`);
      setInventory(response.data);
      if (response.data.shareable_link) {
        setShareableLink(`${window.location.origin}/sign/${response.data.shareable_link}`);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
      setLoading(false);
    }
  };

  const generateShareableLink = async () => {
    try {
      const response = await axios.post(`${API}/inventories/${id}/generate-link`);
      const link = `${window.location.origin}/sign/${response.data.token}`;
      setShareableLink(link);
      navigator.clipboard.writeText(link);
      toast.success("Shareable link copied to clipboard!");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate shareable link");
    }
  };

  const scrollToPhotoVault = (photoPath) => {
    setSelectedPhoto(photoPath);
    photoVaultRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    setTimeout(() => {
      const photoElement = document.getElementById(`photo-${photoPath}`);
      if (photoElement) {
        photoElement.classList.add('ring-4', 'ring-yellow-400');
        setTimeout(() => {
          photoElement.classList.remove('ring-4', 'ring-yellow-400');
        }, 2000);
      }
    }, 500);
  };

  const getAllPhotos = () => {
    if (!inventory) return [];
    
    const photos = [];
    
    inventory.property_overview.property_photos.forEach(photo => {
      photos.push({ path: photo, reference: "Property Overview", description: "Property Photo" });
    });
    
    inventory.health_safety.meters.forEach(meter => {
      if (meter.photo) {
        photos.push({ path: meter.photo, reference: "Meters", description: `${meter.meter_type} Meter - ${meter.location}` });
      }
    });
    
    inventory.rooms.forEach(room => {
      room.items.forEach(item => {
        item.photos.forEach(photo => {
          photos.push({ path: photo, reference: room.room_name, description: item.item_name });
        });
      });
    });
    
    return photos;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700">Loading inventory...</div>
        </div>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">Inventory not found</div>
          <Button onClick={() => navigate("/")} className="mt-4">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const allPhotos = getAllPhotos();

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <header className="bg-black border-b-4 border-[#F5E6D3] shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => navigate("/")} 
                variant="ghost" 
                className="text-[#F5E6D3] hover:bg-[#F5E6D3]/10"
                data-testid="back-to-dashboard-btn"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              {!inventory.signature && (
                <Button 
                  onClick={generateShareableLink} 
                  className="bg-[#F5E6D3] text-black hover:bg-[#D4AF37] font-semibold"
                  data-testid="generate-link-btn"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Generate Shareable Link
                </Button>
              )}
              <Button 
                onClick={() => window.print()} 
                className="bg-[#D4AF37] text-black hover:bg-[#F5E6D3] font-semibold"
                data-testid="download-pdf-btn"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
          {shareableLink && (
            <div className="mt-4 bg-[#F5E6D3] text-black p-4 flex items-center justify-between">
              <div>
                <span className="font-semibold">Shareable Link:</span>
                <span className="ml-2 font-mono text-sm">{shareableLink}</span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(shareableLink);
                  toast.success("Link copied!");
                }}
                className="bg-black text-[#F5E6D3]"
              >
                Copy Link
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border-4 border-black p-8 mb-8 shadow-2xl">
          <div className="flex items-start justify-between mb-6">
            <img src={BergasonLogo} alt="Bergason Property Services" className="h-24 w-24 object-contain" />
            <div className="text-right">
              <h1 className="text-4xl font-bold logo-font">Property Inventory Report</h1>
              <p className="text-gray-600 mt-2">Bergason Property Services</p>
            </div>
          </div>
          
          <div className="border-t-2 border-black pt-6 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Property Address:</span>
                <p className="text-lg">{inventory.property_overview.address}</p>
              </div>
              <div>
                <span className="font-semibold">Inspection Date:</span>
                <p className="text-lg">{inventory.property_overview.inspection_date}</p>
              </div>
              <div>
                <span className="font-semibold">Landlord:</span>
                <p>{inventory.property_overview.landlord_name}</p>
              </div>
              <div>
                <span className="font-semibold">Tenant(s):</span>
                <p>{inventory.property_overview.tenant_names.join(", ")}</p>
              </div>
            </div>
          </div>

          {inventory.signature && (
            <div className="mt-6 pt-6 border-t-2 border-green-600 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-green-800">Status: SIGNED & LOCKED</span>
                  <p className="text-sm text-green-700">Signed by {inventory.signature.tenant_name} on {new Date(inventory.signature.signed_at).toLocaleString()}</p>
                </div>
                <Button
                  onClick={() => navigate(`/verify/${inventory.shareable_link}`)}
                  variant="outline"
                  className="border-2 border-green-600 text-green-800"
                  data-testid="verify-signature-btn"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Verify Signature
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Glossary of Terms */}
        <div className="bg-white border-2 border-black p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-black logo-font">Glossary of Terms</h2>
          <p className="text-gray-700 mb-6">
            For guidance, please find a glossary of terms used within this report:
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 border-l-4 border-green-600 bg-green-50">
              <span className="px-3 py-1 text-sm font-semibold bg-green-100 text-green-800">Excellent</span>
              <p className="text-gray-700 flex-1">
                Item is in pristine condition, as new or recently refurbished. No wear, marks, or damage visible.
              </p>
            </div>

            <div className="flex items-start space-x-4 p-4 border-l-4 border-blue-600 bg-blue-50">
              <span className="px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800">Good</span>
              <p className="text-gray-700 flex-1">
                Item is in good working order with minor signs of wear consistent with normal use. Fully functional and well-maintained.
              </p>
            </div>

            <div className="flex items-start space-x-4 p-4 border-l-4 border-yellow-600 bg-yellow-50">
              <span className="px-3 py-1 text-sm font-semibold bg-yellow-100 text-yellow-800">Fair</span>
              <p className="text-gray-700 flex-1">
                Item shows moderate wear and tear. May have minor marks, scuffs, or fading but remains functional and acceptable.
              </p>
            </div>

            <div className="flex items-start space-x-4 p-4 border-l-4 border-orange-600 bg-orange-50">
              <span className="px-3 py-1 text-sm font-semibold bg-orange-100 text-orange-800">Poor</span>
              <p className="text-gray-700 flex-1">
                Item shows significant wear with visible marks, stains, or damage. May require attention or replacement soon.
              </p>
            </div>

            <div className="flex items-start space-x-4 p-4 border-l-4 border-red-600 bg-red-50">
              <span className="px-3 py-1 text-sm font-semibold bg-red-100 text-red-800">Damaged</span>
              <p className="text-gray-700 flex-1">
                Item is broken, non-functional, or severely damaged. Requires immediate repair or replacement.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-300">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> All condition assessments are made at the time of inspection and documented with photographic evidence where applicable.
            </p>
          </div>
        </div>

        {/* Health & Safety */}
        {(inventory.health_safety.meters.length > 0 || inventory.health_safety.safety_items.length > 0) && (
          <div className="bg-white border-2 border-black p-8 mb-8 shadow-lg">
            <h2 className="text-3xl font-bold mb-4 pb-3 border-b-2 border-black logo-font">Health & Safety</h2>
            
            {inventory.health_safety.meters.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-xl mb-4">Utility Meters</h3>
                {inventory.health_safety.meters.map((meter, index) => (
                  <div key={index} className="border-2 border-gray-300 p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div><span className="font-semibold">Type:</span> {meter.meter_type}</div>
                      <div><span className="font-semibold">Serial:</span> {meter.serial_number}</div>
                      <div><span className="font-semibold">Location:</span> {meter.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inventory.health_safety.safety_items.length > 0 && (
              <div>
                <h3 className="font-bold text-xl mb-4">Safety Equipment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.health_safety.safety_items.map((item, index) => (
                    <div key={index} className="border-2 border-gray-300 p-3">
                      <div className="font-semibold">{item.item_type.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-gray-600">Location: {item.location}</div>
                      <div className="text-sm text-gray-600">Count: {item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Room-by-Room Inventory */}
        {inventory.rooms.filter(room => room.items.length > 0 || room.general_notes !== "").map((room, roomIndex) => (
          <div key={roomIndex} className="bg-white border-2 border-black p-8 mb-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 pb-3 border-b-2 border-gray-400 logo-font">{room.room_name}</h2>
            
            {room.general_notes && (
              <div className="mb-6 bg-gray-50 p-4 border-l-4 border-black">
                <p className="text-gray-700">{room.general_notes}</p>
              </div>
            )}

            {room.items.map((item, itemIndex) => (
              <div key={itemIndex} className="mb-6 pb-6 border-b border-gray-300 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{item.item_name}</h3>
                    <div className="mt-1">
                      <span className={`px-3 py-1 text-sm font-semibold ${
                        item.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
                        item.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                        item.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                        item.condition === 'Poor' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.condition}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-3 text-gray-700"><strong>Description:</strong> {item.description}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      <strong>Reference:</strong> {room.room_name} - {item.item_name} | <strong>Inspection Date:</strong> {inventory.property_overview.inspection_date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportPreview;

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
        {(inventory.health_safety.meters.length > 0 || inventory.health_safety.safety_items.length > 0 || inventory.health_safety.compliance_documents?.length > 0) && (
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
                    {meter.photo && (
                      <div className="mt-3">
                        <img 
                          src={`${BACKEND_URL}${meter.photo}`} 
                          alt={`${meter.meter_type} Meter`} 
                          className="w-64 h-48 object-cover border-2 border-gray-300 cursor-pointer"
                          onClick={() => {
                            const photoVault = document.getElementById('photo-vault-section');
                            if (photoVault) photoVault.scrollIntoView({ behavior: 'smooth' });
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Reference: HS-{index + 1} | Date: {inventory.property_overview.inspection_date}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {inventory.health_safety.safety_items.length > 0 && (
              <div className="mb-6">
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

            {/* Compliance Documents */}
            {inventory.health_safety.compliance_documents?.length > 0 && (
              <div>
                <h3 className="font-bold text-xl mb-4">Pre-Arrival Compliance Documents</h3>
                
                <div className="bg-blue-50 border-2 border-blue-600 p-4 mb-4">
                  <p className="text-sm text-blue-900 font-semibold mb-2">Tenant Confirmation Required</p>
                  <p className="text-sm text-blue-800">
                    I can confirm safe receipt of this property report and agree to receiving the following pre-arrival safety certificates/documents electronically, which I am successfully able to access via the links below:
                  </p>
                </div>

                <div className="space-y-2">
                  {inventory.health_safety.compliance_documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between border-2 border-gray-300 p-3">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 mr-3 text-blue-600" />
                        <span>Document {index + 1}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`${BACKEND_URL}${doc}`, '_blank')}
                        data-testid={`view-document-${index}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View/Download
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gray-50 border-2 border-gray-300">
                  <p className="text-xs text-gray-600">
                    By signing this report, you confirm receipt of all pre-arrival documents including: Gas Safety Certificate, How to Rent Guide, EPC, Deposit Protection Information, and Electrical Safety Certificate.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Room-by-Room Inventory */}
        {inventory.rooms.filter(room => room.items.length > 0 || room.general_notes !== "").map((room, roomIndex) => (
          <div key={roomIndex} className="bg-white border-2 border-black p-8 mb-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 pb-3 border-b-2 border-gray-400 logo-font">{roomIndex + 1}. {room.room_name}</h2>
            
            {room.general_notes && (
              <div className="mb-6 bg-gray-50 p-4 border-l-4 border-black">
                <p className="text-gray-700 text-sm italic">{room.general_notes}</p>
              </div>
            )}

            {/* Table Format like InventoryHive */}
            <table className="w-full border-collapse border-2 border-gray-400">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-2 border-gray-400 p-3 text-left font-bold">Item</th>
                  <th className="border-2 border-gray-400 p-3 text-left font-bold">Description</th>
                  <th className="border-2 border-gray-400 p-3 text-center font-bold w-32">Condition</th>
                  <th className="border-2 border-gray-400 p-3 text-center font-bold w-32">Cleanliness</th>
                  <th className="border-2 border-gray-400 p-3 text-center font-bold w-32">Photos</th>
                </tr>
              </thead>
              <tbody>
                {room.items.map((item, itemIndex) => (
                  <tr key={itemIndex} className="hover:bg-gray-50">
                    <td className="border-2 border-gray-400 p-3 align-top">
                      <div className="font-semibold">{roomIndex + 1}.{itemIndex + 1}</div>
                      <div className="font-bold">{item.item_name}</div>
                    </td>
                    <td className="border-2 border-gray-400 p-3 align-top">
                      <div className="text-sm">
                        <div className="mb-2">
                          <span className="font-semibold">Condition:</span> {item.description || 'As photographed'}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          <strong>Reference:</strong> {room.room_name} - {item.item_name} | <strong>Date:</strong> {inventory.property_overview.inspection_date}
                        </div>
                      </div>
                    </td>
                    <td className="border-2 border-gray-400 p-3 align-top text-center">
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                        item.condition === 'Excellent' ? 'bg-green-500 text-white' :
                        item.condition === 'Good' ? 'bg-green-500 text-white' :
                        item.condition === 'Fair' ? 'bg-orange-500 text-white' :
                        item.condition === 'Poor' ? 'bg-orange-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                        ● {item.condition}
                      </span>
                    </td>
                    <td className="border-2 border-gray-400 p-3 align-top text-center">
                      <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-green-500 text-white">
                        ● Good
                      </span>
                    </td>
                    <td className="border-2 border-gray-400 p-3 align-top text-center">
                      {item.photos && item.photos.length > 0 ? (
                        <button
                          onClick={() => {
                            const photoVault = document.getElementById('photo-vault-section');
                            if (photoVault) {
                              photoVault.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm underline"
                        >
                          📷 {item.photos.length} photo{item.photos.length > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Photo Vault */}
        {(() => {
          const allPhotos = [];
          
          // Room code mapping for references
          const roomCodes = {
            "Hallway": "HW",
            "Living Room": "LR",
            "Dining Room": "DR",
            "Kitchen": "KT",
            "WC": "WC",
            "Bathroom": "BT",
            "Ensuite": "EN",
            "Bedroom 1": "B1",
            "Bedroom 2": "B2",
            "Bedroom 3": "B3",
            "Bedroom 4": "B4",
            "Bedroom 5": "B5",
            "Front Garden": "FG",
            "Rear Garden": "RG",
            "Porch": "PO",
            "Stairs": "ST",
            "Landing": "LD",
            "Airing Cupboard": "AC",
            "Meter Cupboard": "MC",
            "Outbuilding": "OB",
            "Garage": "GR",
            "Loft": "LF",
            "Misc First Floor": "MF"
          };
          
          // Collect property photos
          inventory.property_overview.property_photos?.forEach((photo, index) => {
            allPhotos.push({ 
              path: photo, 
              reference: "Property Overview", 
              description: "Property Photo",
              photoRef: `PO-${index + 1}`,
              date: inventory.property_overview.inspection_date
            });
          });
          
          // Collect meter photos
          inventory.health_safety?.meters?.forEach((meter, meterIndex) => {
            if (meter.photo) {
              allPhotos.push({ 
                path: meter.photo, 
                reference: "Health & Safety", 
                description: `${meter.meter_type} Meter`,
                photoRef: `HS-${meterIndex + 1}`,
                date: inventory.property_overview.inspection_date
              });
            }
          });
          
          // Collect room photos with individual references
          inventory.rooms?.forEach((room, roomIndex) => {
            const roomCode = roomCodes[room.room_name] || `R${roomIndex + 1}`;
            let photoCount = 0;
            
            room.items?.forEach(item => {
              item.photos?.forEach(photo => {
                photoCount++;
                allPhotos.push({ 
                  path: photo, 
                  reference: room.room_name, 
                  description: item.item_name,
                  photoRef: `${roomCode}${roomIndex + 1}-${photoCount}`,
                  date: inventory.property_overview.inspection_date
                });
              });
            });
          });
          
          if (allPhotos.length === 0) return null;
          
          const groupedPhotos = allPhotos.reduce((acc, photo) => {
            if (!acc[photo.reference]) acc[photo.reference] = [];
            acc[photo.reference].push(photo);
            return acc;
          }, {});
          
          return (
            <div id="photo-vault-section" className="bg-white border-2 border-black p-8 shadow-lg mb-8">
              <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-black logo-font">Photo Vault</h2>
              <p className="text-gray-600 mb-6">All photographic evidence from this inventory report with unique references and timestamps</p>
              
              <div className="space-y-8">
                {Object.entries(groupedPhotos).map(([reference, photos]) => (
                  <div key={reference}>
                    <h3 className="text-xl font-bold mb-4 text-black">{reference}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo, index) => (
                        <div 
                          key={index} 
                          id={`photo-${photo.photoRef}`}
                          className="border-2 border-gray-300 hover:border-black transition-all cursor-pointer relative scroll-mt-24"
                        >
                          <img 
                            src={`${BACKEND_URL}${photo.path}`} 
                            alt={photo.description} 
                            className="w-full h-48 object-cover"
                          />
                          {/* Date stamp overlay on photo */}
                          <div className="absolute top-2 right-2 bg-black/75 text-white text-xs px-2 py-1 font-mono">
                            {photo.date}
                          </div>
                          <div className="p-2 bg-gray-50 border-t-2 border-gray-300">
                            <p className="text-xs font-bold text-blue-600">{photo.photoRef}</p>
                            <p className="text-xs font-semibold truncate">{photo.description}</p>
                            <p className="text-xs text-gray-500">{reference}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Disclaimer Section */}
        <div className="bg-amber-50 border-4 border-amber-600 p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-amber-900 logo-font">Disclaimer</h2>
          
          <div className="space-y-4 text-gray-800">
            <p className="leading-relaxed">
              The term 'Inspector' is used hereafter to define the Bergason software user that is responsible for completing this property report. It is the duty and ultimate responsibility of the Inspector and Tenant to agree upon the accuracy of this report.
            </p>

            <p className="leading-relaxed">
              This report has been prepared by an inspector who is not an expert in buildings, furnishings, decorations, woods, antiques or a qualified surveyor.
            </p>

            <p className="leading-relaxed">
              This report relates only to the furniture and all the landlord's equipment and contents in the property. It is no guarantee, or report on, the adequacy of, or safety of, any such equipment or contents, merely a record that such items exist in the property at the date of preparing the report and the superficial condition of same.
            </p>

            <p className="leading-relaxed">
              The inspector will not take water readings unless the meter is clearly visible within the property or attached to an exterior wall at low accessible level.
            </p>

            <p className="leading-relaxed">
              Windows throughout the property have not been tested for function or operation. Descriptions are purely based on the superficial appearance of windows, frames and locks. The inspector can accept no liability arising from any failure of the windows or parts thereof to function properly at all.
            </p>

            <p className="leading-relaxed">
              Inspectors do not check gas or electrical appliances and give no guarantee with regard to the safety or reliability of such items. It should be noted that inspectors are not required to inspect smoke or carbon monoxide alarms, testing such alarm 'test functions' may occur. However, this is no guarantee, or report on, the adequacy of these alarms. It is merely a record that batteries were present (if tested) upon completion of this report.
            </p>

            <p className="leading-relaxed">
              The inspector cannot undertake to move heavy items of furniture or to make searches in inaccessible locations such as loft spaces, cellars, locked rooms and high level cupboards, or to unpack items. Inspectors reserve the right not to handle or move items deemed to be fragile or valuable. In addition, the inspectors reserve the right not to handle items that may be of a health hazard and to generalise/summarise on such items deemed to be unsuitable for further inspection.
            </p>

            <h3 className="text-xl font-bold mt-6 mb-3 text-amber-900">Furniture and furnishings (Fire) Safety Regulations 1988 – (1993)</h3>
            <p className="leading-relaxed">
              The fire and safety regulation regarding furnishings, gas, electrical and similar services are ultimately the responsibility of the instructing principle. Where the report notes "Fire Label Present", this should not be interpreted to mean the item complies with the "furniture and furnishings (fire) (safety) (amendments) 1993". It is a record that the item had a label as described or similar to that detailed in the "guide" published by the Department of Trade and Industry January 1997 (or subsequent date). It is not a statement that the item can be considered to comply with the regulations.
            </p>

            <h3 className="text-xl font-bold mt-6 mb-3 text-amber-900">Safety Certificate and Legislation Compliance</h3>
            <p className="leading-relaxed">
              The safety certificate and legislation compliance checklists in this report are no guarantee, or report on, the adequacy of, or safety of, any such liability contents, merely a record that such steps have been offered by the Bergason software to highlight issues that may exist at the property at the date of preparing this report. Bergason accepts no responsibility for the contents of these steps. It is the responsibility of the Inspector and Tenant to agree upon the accuracy of these steps.
            </p>
          </div>
        </div>

        {/* Guidance Notes to Tenants */}
        <div className="bg-blue-50 border-4 border-blue-600 p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-900 logo-font">Guidance Notes to Tenants</h2>
          
          <div className="space-y-6 text-gray-800">
            <div>
              <h3 className="text-xl font-bold mb-3 text-blue-900">What should I know about the check-out process?</h3>
              <p className="leading-relaxed mb-3">
                At the beginning of the tenancy it is important to note any specific discrepancies on the report that you do not agree with i.e marks on walls, carpets, etc. If no such additional notes are made via the electronic process at the start of the tenancy, the report will be deemed as accepted as read.
              </p>
              <p className="leading-relaxed mb-3">
                The condition of the property at the start of the tenancy, as described in the report will be compared to the condition of the property at the end of tenancy. Details of any alterations to the property after the report has been agreed upon will be recorded by an inspector (Inventory Hive user).
              </p>
              <p className="leading-relaxed mb-3">
                A 'Check-Out' report will be conducted to determine any changes to the report. The tenant should gain permission from the managing agent/landlord if they wish to remove or store any items during the tenancy and this should be confirmed in writing by the managing agent/landlord.
              </p>
              <p className="leading-relaxed">
                The inspector cannot undertake to move heavy items of furniture or to make searches in inaccessible locations such as loft spaces, cellars, locked rooms and high level cupboards, or to unpack items. Inspectors reserve the right not to handle or move items deemed to be fragile or valuable. In addition, the inspector reserves the right not to handle items that may be of a health hazard and to generalise/summarise on such items deemed to be unsuitable for further inspection.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 text-blue-900">What should I know before the check-out report is created?</h3>
              <p className="leading-relaxed mb-3">
                All items should be returned to their original position (as detailed on the report); this includes stored or boxed items not used during the tenancy. Any items listed as 'Item Missing' can often result in a replacement cost or a charge being made. Managing agents/landlords may also charge for the removal of unapproved items left by a tenant at the end of the tenancy that were not included in the original report.
              </p>
              <p className="leading-relaxed mb-3">
                At the time of the property 'Check-Out' all personal items (including consumable items) should have been removed and cleaning of the property completed. Generally, no further cleaning is permitted once the 'Check-Out' inspection has commenced. Tenants should be advised of the date and time of the 'Check-Out' and provide access, or let the appointed inspector know the details of their departure of the property. Additional costs are sometimes charged by managing agents/landlords if the inspector is not able to complete the 'Check-Out' inspection due to the tenant not being ready to vacate or if they are delayed.
              </p>
              <p className="leading-relaxed font-semibold">
                The 'Check-Out' report is advisory and is based on information available to the inspector at the time of the 'Check-Out'. It must not be treated as a final statement of tenant responsibility. It remains the responsibility of the agent/landlord and tenant to fully agree any issues and/or deductions (if any) from the deposit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;

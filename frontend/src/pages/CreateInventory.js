import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Save, Upload, Plus, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import BergasonLogo from "@/assets/bergason-logo.jpg";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PREDEFINED_ROOMS = [
  "Front Garden", "Porch", "Meter Cupboard", "Hallway", "WC",
  "Living Room", "Dining Room", "Kitchen", "Stairs", "Landing",
  "Airing Cupboard", "Bedroom 1", "Bedroom 2", "Bedroom 3", "Bedroom 4",
  "Bedroom 5", "Ensuite", "Bathroom", "Misc First Floor", "Rear Garden",
  "Outbuilding", "Garage", "Loft"
];

const CreateInventory = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  // Property Overview
  const [propertyPhotos, setPropertyPhotos] = useState([]);
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("Residential");
  const [landlordName, setLandlordName] = useState("");
  const [tenantNames, setTenantNames] = useState([""]);
  const [inspectionDate, setInspectionDate] = useState("");
  const [generalDescription, setGeneralDescription] = useState("");
  
  // Health & Safety
  const [meters, setMeters] = useState([]);
  const [safetyItems, setSafetyItems] = useState([]);
  const [complianceDocs, setComplianceDocs] = useState([]);
  
  // Rooms
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    // Initialize rooms with predefined names
    const initialRooms = PREDEFINED_ROOMS.map(roomName => ({
      room_name: roomName,
      general_notes: "",
      items: []
    }));
    setRooms(initialRooms);
  }, []);

  const handlePropertyPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const response = await axios.post(`${API}/upload/property-photo`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setPropertyPhotos(prev => [...prev, response.data.file_path]);
        toast.success("Property photo uploaded");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload photo: " + (error.response?.data?.detail || error.message));
      }
    }
    e.target.value = null; // Reset input
  };

  const addMeter = () => {
    setMeters([...meters, { meter_type: "Electric", serial_number: "", location: "", photo: null }]);
  };

  const updateMeter = (index, field, value) => {
    const updated = [...meters];
    updated[index][field] = value;
    setMeters(updated);
  };

  const handleMeterPhotoUpload = async (index, file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("room_reference", "Meters");
    formData.append("description", `${meters[index].meter_type} Meter`);
    
    try {
      const response = await axios.post(`${API}/upload/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      updateMeter(index, "photo", response.data.file_path);
      toast.success("Meter photo uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload meter photo: " + (error.response?.data?.detail || error.message));
    }
  };

  const addSafetyItem = () => {
    setSafetyItems([...safetyItems, { item_type: "smoke_alarm", location: "", count: 1, photo: null }]);
  };

  const updateSafetyItem = (index, field, value) => {
    const updated = [...safetyItems];
    updated[index][field] = value;
    setSafetyItems(updated);
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const response = await axios.post(`${API}/upload/document`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setComplianceDocs(prev => [...prev, { path: response.data.file_path, name: response.data.original_filename }]);
        toast.success("Document uploaded");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload document: " + (error.response?.data?.detail || error.message));
      }
    }
    e.target.value = null; // Reset input
  };

  const addItemToRoom = (roomIndex) => {
    const updated = [...rooms];
    updated[roomIndex].items.push({
      item_name: "",
      condition: "Good",
      description: "",
      photos: []
    });
    setRooms(updated);
  };

  const updateRoomItem = (roomIndex, itemIndex, field, value) => {
    const updated = [...rooms];
    updated[roomIndex].items[itemIndex][field] = value;
    setRooms(updated);
  };

  const handleItemPhotoUpload = async (roomIndex, itemIndex, file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("room_reference", rooms[roomIndex].room_name);
    formData.append("description", rooms[roomIndex].items[itemIndex].item_name);
    
    try {
      const response = await axios.post(`${API}/upload/photo`, formData);
      const updated = [...rooms];
      updated[roomIndex].items[itemIndex].photos.push(response.data.file_path);
      setRooms(updated);
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error("Failed to upload photo");
    }
  };

  const saveInventory = async () => {
    if (!address || !landlordName || tenantNames[0] === "" || !inspectionDate) {
      toast.error("Please fill in all required property details");
      return;
    }

    setSaving(true);
    
    const inventoryData = {
      property_overview: {
        address,
        property_type: propertyType,
        landlord_name: landlordName,
        tenant_names: tenantNames.filter(name => name !== ""),
        inspection_date: inspectionDate,
        general_description: generalDescription,
        property_photos: propertyPhotos
      },
      health_safety: {
        meters,
        safety_items: safetyItems,
        compliance_documents: complianceDocs.map(doc => doc.path)
      },
      rooms: rooms.filter(room => room.items.length > 0 || room.general_notes !== "")
    };

    try {
      const response = await axios.post(`${API}/inventories`, inventoryData);
      toast.success("Inventory saved successfully");
      navigate(`/preview/${response.data.id}`);
    } catch (error) {
      console.error("Error saving inventory:", error);
      toast.error("Failed to save inventory");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      {/* Header */}
      <header className="bg-black border-b-4 border-[#F5E6D3] shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => navigate("/")} 
                variant="ghost" 
                className="text-[#F5E6D3] hover:bg-[#F5E6D3]/10"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-[#F5E6D3] logo-font">Create New Inventory</h1>
            </div>
            <Button 
              onClick={saveInventory} 
              disabled={saving}
              className="bg-[#F5E6D3] text-black hover:bg-[#D4AF37] font-semibold px-6"
              data-testid="save-inventory-btn"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? "Saving..." : "Save Inventory"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Disclaimer */}
        <div className="bg-amber-50 border-2 border-amber-600 p-6 mb-8 shadow-lg">
          <h3 className="font-bold text-lg mb-2 text-amber-900">Important Disclaimer</h3>
          <p className="text-sm text-amber-800">
            [Placeholder: Your inventory disclaimer text will appear here. This document records the condition of the property at the time of inspection and will be used for reference purposes.]
          </p>
        </div>

        {/* Section 1: Property Overview */}
        <div className="bg-white border-2 border-black p-8 shadow-lg mb-8" data-testid="property-overview-section">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-black logo-font">Property Overview</h2>
          
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold mb-2">Property Photos</Label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePropertyPhotoUpload}
                  className="hidden"
                  id="property-photo-upload"
                />
                <Button
                  onClick={() => document.getElementById('property-photo-upload').click()}
                  variant="outline"
                  className="border-2 border-black"
                  data-testid="upload-property-photo-btn"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Upload Photos
                </Button>
              </div>
              <div className="photo-grid mt-4">
                {propertyPhotos.map((photo, index) => (
                  <div key={index} className="photo-item">
                    <img src={`${BACKEND_URL}${photo}`} alt={`Property ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-lg font-semibold mb-2">Property Address *</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full property address"
                  className="border-2 border-gray-300 focus:border-black"
                  data-testid="address-input"
                />
              </div>
              
              <div>
                <Label className="text-lg font-semibold mb-2">Property Type</Label>
                <Input
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="border-2 border-gray-300 focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-lg font-semibold mb-2">Landlord Name *</Label>
                <Input
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  placeholder="Enter landlord name"
                  className="border-2 border-gray-300 focus:border-black"
                  data-testid="landlord-input"
                />
              </div>
              
              <div>
                <Label className="text-lg font-semibold mb-2">Inspection Date *</Label>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="border-2 border-gray-300 focus:border-black"
                  data-testid="inspection-date-input"
                />
              </div>
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2">Tenant Name(s) *</Label>
              {tenantNames.map((name, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input
                    value={name}
                    onChange={(e) => {
                      const updated = [...tenantNames];
                      updated[index] = e.target.value;
                      setTenantNames(updated);
                    }}
                    placeholder="Enter tenant name"
                    className="border-2 border-gray-300 focus:border-black"
                    data-testid={`tenant-name-input-${index}`}
                  />
                  {index === tenantNames.length - 1 && (
                    <Button
                      onClick={() => setTenantNames([...tenantNames, ""])}
                      variant="outline"
                      className="border-2 border-black"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <Label className="text-lg font-semibold mb-2">General Property Description</Label>
              <Textarea
                value={generalDescription}
                onChange={(e) => setGeneralDescription(e.target.value)}
                placeholder="Enter general property description"
                rows={4}
                className="border-2 border-gray-300 focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Health & Safety */}
        <div className="bg-white border-2 border-black p-8 shadow-lg mb-8" data-testid="health-safety-section">
          <h2 className="text-3xl font-bold mb-4 pb-3 border-b-2 border-black logo-font">Health & Safety / Legal Compliance</h2>
          
          <div className="bg-blue-50 border-2 border-blue-600 p-4 mb-6">
            <p className="text-sm text-blue-800">
              [Placeholder: Legal disclaimer text. This section documents safety equipment and meter information as required by law.]
            </p>
            <p className="text-sm text-blue-800 mt-2 font-semibold">
              Note: Printed copies of this report and all attached documents are available upon request.
            </p>
          </div>

          {/* Meters */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Utility Meters</h3>
              <Button onClick={addMeter} variant="outline" className="border-2 border-black" data-testid="add-meter-btn">
                <Plus className="w-5 h-5 mr-2" />
                Add Meter
              </Button>
            </div>
            
            {meters.map((meter, index) => (
              <div key={index} className="border-2 border-gray-300 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Meter Type</Label>
                    <Select value={meter.meter_type} onValueChange={(value) => updateMeter(index, "meter_type", value)}>
                      <SelectTrigger className="border-2 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Gas">Gas</SelectItem>
                        <SelectItem value="Water">Water</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Serial Number</Label>
                    <Input
                      value={meter.serial_number}
                      onChange={(e) => updateMeter(index, "serial_number", e.target.value)}
                      placeholder="Enter serial number"
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={meter.location}
                      onChange={(e) => updateMeter(index, "location", e.target.value)}
                      placeholder="e.g., Under stairs"
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Meter Photo</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMeterPhotoUpload(index, e.target.files[0])}
                    className="block w-full text-sm"
                  />
                  {meter.photo && (
                    <img src={`${BACKEND_URL}${meter.photo}`} alt="Meter" className="mt-2 w-32 h-32 object-cover border-2" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Safety Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Safety Equipment</h3>
              <Button onClick={addSafetyItem} variant="outline" className="border-2 border-black" data-testid="add-safety-item-btn">
                <Plus className="w-5 h-5 mr-2" />
                Add Safety Item
              </Button>
            </div>
            
            {safetyItems.map((item, index) => (
              <div key={index} className="border-2 border-gray-300 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Item Type</Label>
                    <Select value={item.item_type} onValueChange={(value) => updateSafetyItem(index, "item_type", value)}>
                      <SelectTrigger className="border-2 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smoke_alarm">Smoke Alarm</SelectItem>
                        <SelectItem value="co_detector">CO Detector</SelectItem>
                        <SelectItem value="fire_extinguisher">Fire Extinguisher</SelectItem>
                        <SelectItem value="fuse_box">Fuse Box</SelectItem>
                        <SelectItem value="stopcock">Stopcock</SelectItem>
                        <SelectItem value="gas_valve">Gas Valve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={item.location}
                      onChange={(e) => updateSafetyItem(index, "location", e.target.value)}
                      placeholder="Enter location"
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label>Count</Label>
                    <Input
                      type="number"
                      value={item.count}
                      onChange={(e) => updateSafetyItem(index, "count", parseInt(e.target.value))}
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Documents */}
          <div>
            <h3 className="text-xl font-bold mb-4">Compliance Documents</h3>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              onChange={handleDocumentUpload}
              className="hidden"
              id="document-upload"
            />
            <Button
              onClick={() => document.getElementById('document-upload').click()}
              variant="outline"
              className="border-2 border-black mb-4"
              data-testid="upload-compliance-doc-btn"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Documents
            </Button>
            <div className="space-y-2">
              {complianceDocs.map((doc, index) => (
                <div key={index} className="flex items-center justify-between border-2 border-gray-300 p-3">
                  <span className="text-sm">{doc.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setComplianceDocs(complianceDocs.filter((_, i) => i !== index))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Rooms */}
        <div className="bg-white border-2 border-black p-8 shadow-lg mb-8" data-testid="rooms-section">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-black logo-font">Room-by-Room Inventory</h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            {rooms.map((room, roomIndex) => (
              <AccordionItem key={roomIndex} value={`room-${roomIndex}`} className="border-2 border-gray-300">
                <AccordionTrigger className="px-6 hover:bg-gray-50 text-lg font-semibold" data-testid={`room-accordion-${roomIndex}`}>
                  {room.room_name}
                </AccordionTrigger>
                <AccordionContent className="px-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <Label>General Room Notes</Label>
                      <Textarea
                        value={room.general_notes}
                        onChange={(e) => {
                          const updated = [...rooms];
                          updated[roomIndex].general_notes = e.target.value;
                          setRooms(updated);
                        }}
                        placeholder="Enter general notes about this room"
                        className="border-2 border-gray-300"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold">Items</h4>
                        <Button
                          onClick={() => addItemToRoom(roomIndex)}
                          variant="outline"
                          size="sm"
                          className="border-2 border-black"
                          data-testid={`add-item-btn-${roomIndex}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>

                      {room.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="border-2 border-gray-200 p-4 mb-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label>Item Name</Label>
                              <Input
                                value={item.item_name}
                                onChange={(e) => updateRoomItem(roomIndex, itemIndex, "item_name", e.target.value)}
                                placeholder="e.g., Walls, Carpet, Window"
                                className="border-2 border-gray-300"
                              />
                            </div>
                            <div>
                              <Label>Condition</Label>
                              <Select
                                value={item.condition}
                                onValueChange={(value) => updateRoomItem(roomIndex, itemIndex, "condition", value)}
                              >
                                <SelectTrigger className="border-2 border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Excellent">Excellent</SelectItem>
                                  <SelectItem value="Good">Good</SelectItem>
                                  <SelectItem value="Fair">Fair</SelectItem>
                                  <SelectItem value="Poor">Poor</SelectItem>
                                  <SelectItem value="Damaged">Damaged</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="mb-4">
                            <Label>Description / Notes</Label>
                            <Textarea
                              value={item.description}
                              onChange={(e) => updateRoomItem(roomIndex, itemIndex, "description", e.target.value)}
                              placeholder="Enter detailed description"
                              className="border-2 border-gray-300"
                            />
                          </div>
                          <div>
                            <Label>Photos</Label>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                Array.from(e.target.files).forEach(file => {
                                  handleItemPhotoUpload(roomIndex, itemIndex, file);
                                });
                              }}
                              className="block w-full text-sm"
                            />
                            <div className="photo-grid mt-4">
                              {item.photos.map((photo, photoIndex) => (
                                <div key={photoIndex} className="photo-item">
                                  <img src={`${BACKEND_URL}${photo}`} alt={`Item ${photoIndex + 1}`} />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Save Button */}
        <div className="text-center">
          <Button
            onClick={saveInventory}
            disabled={saving}
            className="bg-black text-[#F5E6D3] hover:bg-gray-800 px-12 py-6 text-xl font-bold"
            data-testid="final-save-btn"
          >
            <Save className="w-6 h-6 mr-3" />
            {saving ? "Saving Inventory..." : "Save & Preview Inventory"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateInventory;
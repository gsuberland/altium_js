/*

altium.js schematic document parser

Copyright (c) 2022 Graham Sutherland

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

class AltiumRecord
{
	static #stringDecoder = new TextDecoder('utf-8');
	static get StringDecoder() { return AltiumRecord.#stringDecoder; }
	
	get string_contents()
	{
		return AltiumRecord.StringDecoder.decode(this.data).slice(0, -1);
	}
	
	get attributes()
	{
		const regex = /(?:\|(?<name>[^|=]+?)=(?<value>[^|=]+))/gm;
		let contents = this.string_contents;
		return Array.from(contents.matchAll(regex), (m) => m.groups);
	}
	
	constructor(stream, index)
	{
		this.record_index = index;
		this.stream = stream;
		this.position = stream.u8stream_position;
		this.payload_length = stream.read_u16_le();
		this.padding = stream.read_u8();
		if (this.padding != 0)
			console.warn("Padding byte on record index " + index.toString() + " was non-zero.");
		this.record_type = stream.read_u8();
		if (this.record_type != 0)
			throw new Error("Invalid record type.");
		this.data = stream.read(this.payload_length);
		this.record_id = -1;
		if (this.data.length > "|RECORD=255|".length)
		{
			// check if this starts with |RECORD=
			if (this.data.compare_to(new Uint8Array([0x7c, 0x52, 0x45, 0x43, 0x4f, 0x52, 0x44, 0x3d])))
			{
				let recordFieldStr = AltiumRecord.StringDecoder.decode(this.data.slice(8, 12));
				let recordIdStr = recordFieldStr.split('|')[0];
				this.record_id = Number.parseInt(recordIdStr, 10);
			}
		}
	}
}

class AltiumObject
{
	static RecordObjectMap = [];
	
	constructor(record)
	{
		this.record_index = record.record_index;
		this.source_record = record;
		this.attributes_raw = record.attributes;
		this.attributes = {};
		for (let attrib of this.attributes_raw)
		{
			this.attributes[attrib.name.toLowerCase().replaceAll('%', '_').replace('.', '_')] = attrib.value;
		}
		this.owner_record_index = Number.parseInt(this.attributes.ownerindex ?? "-1", 10);
		this.index_in_sheet = Number.parseInt(this.attributes.indexinsheet ?? "-1", 10);
		this.owner_part_id = (this.attributes.ownerpartid == null) ? null : Number.parseInt(this.attributes.ownerpartid, 10);
		this.parent_object = null;
		this.child_objects = [];
	}
	
	find_parent(type)
	{
		let currentParent = this.parent_object;
		const BLOWN = 1024; // nesting limit
		let fuse = 0;
		while ((++fuse != BLOWN) && (currentParent != null) && !(currentParent instanceof type))
		{
			currentParent = currentParent.parent_object;
		}
		if (fuse >= BLOWN)
			return null;
		return currentParent;
	}
}

class AltiumComponent extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 1, name: "Component", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.library_reference = this.attributes.libreference;
		this.design_item_id = this.attributes.designitemid;
		this.description = (this.attributes._utf8_componentdescription ?? this.attributes.componentdescription) ?? "";
		this.current_part_id = Number.parseInt(this.attributes.currentpartid ?? "-1", 10);
		this.part_count = Number.parseInt(this.attributes.partcount ?? "1", 10);
	}
}

class AltiumPin extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 2, name: "Pin", type: this }) }
	
	constructor(record)
	{
		super(record);
		
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.length = Number.parseInt(this.attributes.pinlength, 10);
		let conglomerate = Number.parseInt(this.attributes.pinconglomerate, 10);
		this.orientation = conglomerate & 3;
		this.angle = 90 * this.orientation;
		this.name = (this.attributes._utf8_name ?? this.attributes.name) ?? "";
		this.show_name = (conglomerate & 0x8) == 0x8;
		this.show_designator = (conglomerate & 0x10) == 0x10;
		const angle_vec_table = [
			[1, 0],
			[0, 1],
			[-1, 0],
			[0, -1]
		];
		this.angle_vec = angle_vec_table[this.orientation];
		// unclear values here. python-altium docs suggest values of 0,16,21, but in practice I've only seen 5.
		this.name_orientation = Number.parseInt(this.attributes.pinname_positionconglomerate ?? "0", 10);
	}
}

class AltiumIEEESymbol extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 3, name: "IEEE Symbol", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumLabel extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 4, name: "Label", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.text = this.attributes.text;
		this.hidden = (this.attributes.ishidden ?? "") == "T";
		this.colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.orientation = Number.parseInt(this.attributes.orientation ?? "0", 10);
		this.justification = Number.parseInt(this.attributes.justification ?? "0", 10);
	}
}

class AltiumBezier extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 5, name: "Bezier", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumPolyline extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 6, name: "Polyline", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.points = [];
		let idx = 1;
		while (this.attributes["x" + idx.toString()] != null)
		{
			let x = Number.parseInt(this.attributes["x" + idx.toString()], 10);
			let y = Number.parseInt(this.attributes["y" + idx.toString()], 10);
			this.points.push({ x: x, y: y });
			idx++;
		}
		this.width = Number.parseInt(this.attributes.linewidth ?? "0", 10);
		this.colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.start_shape = Number.parseInt(this.attributes.startlineshape ?? "0", 10);
		this.end_shape = Number.parseInt(this.attributes.endlineshape ?? "0", 10);
		this.shape_size = Number.parseInt(this.attributes.lineshapesize ?? "0", 10);
		this.line_style = Number.parseInt(this.attributes.linestyle ?? "0", 10); // 0 = solid, 1 = dashed, 2 = dotted, 3 = dash-dotted
	}
}

class AltiumPolygon extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 7, name: "Polygon", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.points = [];
		let idx = 1;
		while (this.attributes["x" + idx.toString()] != null)
		{
			let x = Number.parseInt(this.attributes["x" + idx.toString()], 10);
			let y = Number.parseInt(this.attributes["y" + idx.toString()], 10);
			this.points.push({ x: x, y: y });
			idx++;
		}
		this.width = Number.parseInt(this.attributes.linewidth ?? "0", 10);
		this.line_colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.fill_colour = Number.parseInt(this.attributes.areacolor ?? "0", 10);
	}
}

class AltiumEllipse extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 8, name: "Ellipse", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.radius_x = Number.parseInt(this.attributes.radius, 10);
		if (this.attributes.secondaryradius != null)
			this.radius_y = Number.parseInt(this.attributes.secondaryradius, 10);
		else
			this.radius_y = this.radius_x;
		this.width = Number.parseInt(this.attributes.linewidth ?? "1", 10);
		this.line_colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.fill_colour = Number.parseInt(this.attributes.areacolor ?? "0", 10);
		this.transparent = (this.attributes.issolid ?? "") != "T";
	}
}

class AltiumPiechart extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 9, name: "Piechart", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}


class AltiumRoundedRectangle extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 10, name: "Rounded Rectangle", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}


class AltiumEllipticalArc extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 11, name: "Ellipitcal Arc", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}


class AltiumArc extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 12, name: "Arc", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.radius = Number.parseInt(this.attributes.radius, 10);
		this.start_angle = Number.parseFloat(this.attributes.startangle ?? "0");
		this.end_angle = Number.parseFloat(this.attributes.endangle ?? "360");
		this.width = Number.parseInt(this.attributes.linewidth ?? "1", 10);
		this.colour = Number.parseInt(this.attributes.color ?? "0", 10);
	}
}

class AltiumLine extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 13, name: "Line", type: this }) }
	
	constructor(record)
	{
		super(record);
		
		this.x1 = Number.parseInt(this.attributes.location_x, 10);
		this.x2 = Number.parseInt(this.attributes.corner_x, 10);
		this.y1 = Number.parseInt(this.attributes.location_y, 10);
		this.y2 = Number.parseInt(this.attributes.corner_y, 10);
		this.width = Number.parseInt(this.attributes.linewidth ?? "1", 10);
		this.colour = Number.parseInt(this.attributes.color ?? "0", 10);
	}
}

class AltiumRectangle extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 14, name: "Rectangle", type: this }) }
	
	constructor(record)
	{
		super(record);
		
		this.left = Number.parseInt(this.attributes.location_x, 10);
		this.right = Number.parseInt(this.attributes.corner_x, 10);
		this.top = Number.parseInt(this.attributes.corner_y, 10);
		this.bottom = Number.parseInt(this.attributes.location_y, 10);
		this.line_colour = Number.parseInt(this.attributes.color, 10);
		this.fill_colour = Number.parseInt(this.attributes.areacolor, 10);
		this.transparent = (this.attributes.issolid ?? "F") != "T" || (this.attributes.transparent ?? "F") == "T";
	}
}

class AltiumSheetSymbol extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 15, name: "Sheet Symbol", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumSheetEntry extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 16, name: "Sheet Entry", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumPowerPort extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 17, name: "Power Port", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.show_text = (this.attributes.shownetname ?? "") == "T";
		this.text = (this.attributes._utf8_text ?? this.attributes.text) ?? "";
		this.style = Number.parseInt(this.attributes.style ?? "0", 10);
		const styleNames = ["DEFAULT", "ARROW", "BAR", "WAVE", "POWER_GND", "SIGNAL_GND", "EARTH", "GOST_ARROW", "GOST_POWER_GND", "GOST_EARTH", "GOST_BAR"];
		this.style_name = (this.style < 0 || this.style > styleNames.length-1) ? "UNKNOWN" : styleNames[this.style];
		this.orientation = Number.parseInt(this.attributes.orientation ?? "0", 10);
		this.is_off_sheet_connector = (this.attributes.iscrosssheetconnector ?? "") == "T";
	}
}

class AltiumPort extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 18, name: "Port", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumNoERC extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 22, name: "No ERC", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumNetLabel extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 25, name: "Net Label", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.text = (this.attributes._utf8_text ?? this.attributes.text) ?? "";
		this.orientation = Number.parseInt(this.attributes.orientation ?? "0", 10);
		this.justification = Number.parseInt(this.attributes.justification ?? "0", 10);
	}
}

class AltiumBus extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 26, name: "Bus", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumWire extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 27, name: "Wire", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.points = [];
		let idx = 1;
		while (this.attributes["x" + idx.toString()] != null)
		{
			let x = Number.parseInt(this.attributes["x" + idx.toString()], 10);
			let y = Number.parseInt(this.attributes["y" + idx.toString()], 10);
			this.points.push({ x: x, y: y });
			idx++;
		}
		this.colour = Number.parseInt(this.attributes.color, 10);
	}
}

class AltiumTextFrame extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 28, name: "Text Frame", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.left = Number.parseInt(this.attributes.location_x, 10);
		this.bottom = Number.parseInt(this.attributes.location_y, 10);
		this.right = Number.parseInt(this.attributes.corner_x, 10);
		this.top = Number.parseInt(this.attributes.corner_y, 10);
		this.border_colour = Number.parseInt(this.attributes.color ?? "0", 10);
		this.text_colour = Number.parseInt(this.attributes.textcolor ?? "0", 10);
		this.fill_colour = Number.parseInt(this.attributes.areacolor ?? "16777215", 10);
		this.text = (this.attributes._utf8_text ?? this.attributes.text) ?? "";
		this.orientation = Number.parseInt(this.attributes.orientation ?? "0", 10);
		this.alignment = Number.parseInt(this.attributes.alignment ?? "0", 10);
		this.show_border = (this.attributes.showborder ?? "") == "T";
		this.transparent = (this.attributes.issolid ?? "") != "F";
		this.text_margin = Number.parseInt(this.attributes.textmargin ?? "2", 10);
		this.word_wrap = (this.attributes.wordwrap ?? "F") == "T";
		this.font_id = Number.parseInt(this.attributes.fontid ?? "-1", 10);
	}
}

class AltiumJunction extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 29, name: "Junction", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x, 10);
		this.y = Number.parseInt(this.attributes.location_y, 10);
		this.colour = Number.parseInt(this.attributes.color, 10);
	}
}

class AltiumImage extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 30, name: "Image", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumSheet extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 31, name: "Sheet", type: this }) }
	
	static #sheetSizes = [
		[1150, 760],
		[1550, 1110],
		[2230, 1570],
		[3150, 2230],
		[4460, 3150],
		[950, 750],
		[1500, 950],
		[2000, 1500],
		[3200, 2000],
		[4200, 3200],
		[1100, 850],
		[1400, 850],
		[1700, 1100],
		[990, 790],
		[1540, 990],
		[2060, 1560],
		[3260, 2060],
		[4280, 3280]
	];
	
	constructor(record)
	{
		super(record);
		
		this.grid_size = Number.parseInt(this.attributes.visiblegridsize ?? "10", 10);
		this.show_grid = (this.attributes.visiblegridon ?? "") != "F";
		
		if (this.attributes.usecustomsheet == 'T')
		{
			this.width = Number.parseInt(this.attributes.customx, 10);
			this.height = Number.parseInt(this.attributes.customy, 10);
		}
		else
		{
			let paperSize = Number.parseInt(this.attributes.sheetstyle ?? "0", 10);
			if (paperSize < AltiumSheet.#sheetSizes.length)
			{
				this.width = AltiumSheet.#sheetSizes[paperSize][0];
				this.height = AltiumSheet.#sheetSizes[paperSize][1];
			}
		}
		
		let f = 1;
		this.fonts = {};
		while (this.attributes["fontname" + f.toString()] != null)
		{
			const fontName = this.attributes["fontname" + f.toString()];
			const fontSize = Number.parseInt(this.attributes["size" + f.toString()] ?? "12", 10);
			this.fonts[f] = { name: fontName, size: fontSize };
			f++;
		}
	}
}

class AltiumDesignator extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 34, name: "Designator", type: this }) }
	
	get full_designator()
	{
		const parent = this.find_parent(AltiumComponent);
		
		if (parent == null)
			return this.text;
		
		if (parent.part_count <= 2) // for some reason part count is 2 for single-part components
			return this.text;
		
		if (parent.current_part_id <= 0)
			return this.text;
		
		if (parent.current_part_id <= 26)
			return this.text + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[parent.current_part_id-1];
		else
			return this.text + "[" + parent.current_part_id + "]";
	}
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x ?? "0", 10);
		this.y = Number.parseInt(this.attributes.location_y ?? "0", 10);
		this.colour = Number.parseInt(this.attributes.colour ?? "0", 10);
		this.hidden = (this.attributes.ishidden ?? "") == "T";
		this.text = (this.attributes._utf8_text ?? this.attributes.text) ?? "";
		this.mirrored = (this.attributes.ismirrored ?? "") == "T";
		this.orientation = Number.parseInt(this.attributes.orientation ?? "0", 10);
	}
}

class AltiumParameter extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 41, name: "Parameter", type: this }) }
	
	get is_implementation_parameter()
	{
		return this.parent_object instanceof AltiumImplementationParameterList;
	}
	
	constructor(record)
	{
		super(record);
		this.x = Number.parseInt(this.attributes.location_x ?? "0", 10);
		this.y = Number.parseInt(this.attributes.location_y ?? "0", 10);
		this.colour = Number.parseInt(this.attributes.colour ?? "0", 10);
		this.text = (this.attributes._utf8_text ?? this.attributes.text) ?? "";
		this.hidden = (this.attributes.ishidden ?? "") == "T";
		this.mirrored = (this.attributes.ismirrored ?? "") == "T";
		this.orientation = Number.parseInt(this.attributes.orientation ?? "0", 10);
	}
}

class AltiumWarningSign extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 43, name: "Warning Sign", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumImplementationList extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 44, name: "Implementation List", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumImplementation extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 45, name: "Implementation", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.is_current = (this.attributes.iscurrent ?? "") == "T";
		this.description = this.attributes.description;
		this.model_name = this.attributes.modelname;
		this.is_footprint = this.attributes.modeltype == "PCBLIB";
		this.is_sim = this.attributes.modeltype == "SIM";
		this.is_signal_integrity = this.attributes.modeltype == "SI";
	}
}

class AltiumImplementationPinAssociation extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 46, name: "Implementation Pin Association", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumImplementationPin extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 47, name: "Implementation Pin", type: this }) }
	
	constructor(record)
	{
		super(record);
		this.pin_name = this.attributes.desintf;
	}
}

class AltiumImplementationParameterList extends AltiumObject
{
	static { AltiumObject.RecordObjectMap.push({ id: 48, name: "Implementation Parameter List", type: this }) }
	
	constructor(record)
	{
		super(record);
	}
}

class AltiumDocument
{
	constructor(stream)
	{
		this.stream = stream;
		this.records = [];
		let index = -1; // header comes first, so give it an index of -1
		while (this.stream.u8stream_position < this.stream.length)
		{
			this.records.push(new AltiumRecord(this.stream, index));
			index++;
		}
		this.objects = [];
		let record_object_lookup = {};
		for (let record of this.records)
		{
			// skip the header object
			if (record.record_index < 0)
				continue;
			
			let mapping = AltiumObject.RecordObjectMap.find((rom) => rom.id == record.record_id);
			let recordObject = null;
			if (mapping != null)
			{
				const objectType = mapping.type;
				recordObject = new objectType(record);
			}
			else
			{
				// generic object (specific parsing unimplemented)
				recordObject = new AltiumObject(record);
				recordObject.is_unknown_type = true;
			}
			this.objects.push(recordObject);
			record_object_lookup[record.record_index] = recordObject;
		}
		for (let object of this.objects)
		{
			if (object.owner_record_index < 0)
				continue;
			let ownerObject = record_object_lookup[object.owner_record_index];
			if (ownerObject == null)
				continue;
			object.parent_object = ownerObject;
			ownerObject.child_objects.push(object);
		}
		this.record_object_lookup = record_object_lookup;
		
		this.sheet = this.objects.find(o => o instanceof AltiumSheet);
	}
	
	object_from_record_index(index)
	{
		for (let obj of this.objects)
		{
			if (obj.record_index == index)
				return obj;
		}
		return null;
	}
	
	find_parent_record(start_index, record_type)
	{
		let currentRecord = this.records.find((r) => r.record_index == start_index);
		if (currentRecord == null)
			return null;
		while (true)
		{
			if (currentRecord.record_id == record_type)
				return currentRecord;
			
			let ownerIndexAttr = currentRecord.attributes.find((a) => a.name.toLowerCase() == "ownerindex");
			
			if (ownerIndexAttr == null || ownerIndexAttr?.value == null || ownerIndexAttr?.value == "")
				return null;
			let ownerIndex = Number.parseInt(ownerIndexAttr.value, 10);
			if (ownerIndex < 0)
				return null;
			
			let nextRecord = this.records.find((r) => r.record_index == ownerIndex);
			if (nextRecord == null)
				return null;
			
			currentRecord = nextRecord;
		}
	}
	
	find_child_records(parent_index, record_type=null)
	{
		results = [];
		for (let currentRecord in this.records)
		{
			if (record_type != null && currentRecord.record_id != record_type)
				continue;
			
			let ownerIndexAttr = currentRecord.attributes.find((a) => a.name.toLowerCase() == "ownerindex");
			if (ownerIndexAttr == null || ownerIndexAttr?.value == null || ownerIndexAttr?.value == "")
				continue;
			
			let ownerIndex = Number.parseInt(ownerIndexAttr.value, 10);
			if (ownerIndex == parent_index)
				results.push(currentRecord);
		}
		return results;
	}
}
/*

altium.js OLE parser

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


class OLE
{
	static get ExpectedMagicNumber() { return new Uint8Array([ 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 ]) }
	static get ExpectedMajorVersion() { return 0x0003; }
	static get ExpectedMinorVersion() { return 0x003E; }
	static get ExpectedByteOrder() { return 0xFFFE; }
	static get ExpectedSectorShift() { return 0x0009; }
	static get ExpectedMiniSectorShift() { return 0x0006; }
	static get ExpectedNumberOfDirectorySectors() { return 0; }
	
	constructor(fileData)
	{
		this.stream = new U8Stream(fileData);
		
		if (fileData.length < 76)
		{
			throw new Error("File is too small to be a valid OLE compound document.");
		}
		
		this.header = {};
		
		this.header.signature = this.stream.read(8);
		if (!this.header.signature.compare_to(OLE.ExpectedMagicNumber))
		{
			throw new Error("File does not start with the correct OLE header signature.");
		}
		
		this.header.clsid = this.stream.read(16);
		if (!this.header.clsid.every((b) => b === 0))
		{
			console.warn("OLE header CLSID was not set to all zeroes.");
		}
		
		this.header.minor_version = this.stream.read_u16_le();
		this.header.major_version = this.stream.read_u16_le();
		if (this.header.major_version != OLE.ExpectedMajorVersion || this.header.minor_version != OLE.ExpectedMinorVersion)
		{
			throw new Error("OLE header does not have expected OLE version number.");
		}
		
		this.header.byte_order = this.stream.read_u16_le();
		if (this.header.byte_order != OLE.ExpectedByteOrder)
		{
			throw new Error("OLE header does not have expected byte order value.");
		}
		
		this.header.sector_shift = this.stream.read_u16_le();
		if (this.header.sector_shift != OLE.ExpectedSectorShift)
		{
			throw new Error("OLE header does not have expected sector shift value.");
		}
		this.header.sector_size = 1 << this.header.sector_shift;
		
		this.header.mini_sector_shift = this.stream.read_u16_le();
		if (this.header.mini_sector_shift != OLE.ExpectedMiniSectorShift)
		{
			throw new Error("OLE header does not have expected mini sector shift value.");
		}
		this.header.mini_sector_size = 1 << this.header.mini_sector_shift;
		
		if (!this.stream.read(6).every((b) => b === 0))
		{
			console.warn("OLE header reserved field was not set to all zeroes.");
		}
		
		// directory sectors are unsupported for V3
		this.header.directory_sector_count = this.stream.read_u32_le();
		if (this.header.directory_sector_count != OLE.ExpectedNumberOfDirectorySectors)
		{
			throw new Error("OLE header does not have expected number of directory sectors.");
		}
		
		this.header.fat_sector_count = this.stream.read_u32_le();
		this.header.first_directory_sector_location = this.stream.read_u32_le();
		this.header.transaction_signature_number = this.stream.read_u32_le();
		this.header.mini_stream_cutoff_size = this.stream.read_u32_le();
		this.header.fist_mini_fat_sector_location = this.stream.read_u32_le();
		this.header.number_of_mini_fat_sectors = this.stream.read_u32_le();
		this.header.first_difat_sector_location = this.stream.read_u32_le();
		this.header.number_of_difat_sectors = this.stream.read_u32_le();
		
		this.header.difat = new Uint32Array(this.stream.read(436, true));
		this.fat_sectors = [];
		for (let i = 0; i < 109; i++)
		{
			this.fat_sectors[i] = new FATSector(this, this.header.difat[i]);
		}
		this.directory_entries = [];
		this.directory_entries[0] = new DirectoryEntry(this, (this.header.first_directory_sector_location + 1) * this.header.sector_size);
		this.directory_entries[1] = new DirectoryEntry(this, (this.header.first_directory_sector_location + 1) * this.header.sector_size + 128);
		this.directory_entries[2] = new DirectoryEntry(this, (this.header.first_directory_sector_location + 1) * this.header.sector_size + 256);
		this.directory_entries[3] = new DirectoryEntry(this, (this.header.first_directory_sector_location + 1) * this.header.sector_size + 384);
		
	}
}

class FATSector
{
	constructor(ole, sector_location)
	{
		this.ole = ole;
		this.sector_location = sector_location;
		const typeMap = [
			{ value: 0xFFFFFFFC, name: "DIFSECT" },
			{ value: 0xFFFFFFFD, name: "FATSECT" },
			{ value: 0xFFFFFFFE, name: "ENDOFCHAIN" },
			{ value: 0xFFFFFFFF, name: "FREESECT" },
		];
		if (this.sector_location >= 0xFFFFFFC)
		{
			this.entries = [];
			this.type = typeMap.find(tm => tm.value == this.sector_location).name;
		}
		else
		{
			this.type = "FAT";
			ole.stream.seek_to((this.sector_location + 1) * ole.header.sector_size);
			this.entries = new Uint32Array(ole.stream.read(ole.header.sector_size - 4, true));
			this.next_difat_sector = ole.stream.read_u32_le();
		}
	}
}

class DirectoryEntry
{
	constructor(ole, position)
	{
		this.ole = ole;
		this.position = position;
		ole.stream.seek_to(position);
		
		let name_bytes = ole.stream.read(64);
		let name_len = ole.stream.read_u16_le();
		if (name_len > 64)
		{
			throw new Error("Name length field exceeded maximum size of 64.");
		}
		this.name_field_length = name_len;
		this.name = new TextDecoder("utf-16").decode(name_bytes.slice(0, name_len));
		if (this.name.endsWith("\u0000"))
			this.name = this.name.slice(0, this.name.indexOf("\u0000"));
		
		this.object_type = ole.stream.read_u8();
		this.colour_flag = ole.stream.read_u8();
		this.left_sibling = ole.stream.read_u32_le();
		this.right_sibling = ole.stream.read_u32_le();
		this.child_id = ole.stream.read_u32_le();
		this.clsid = ole.stream.read(16);
		this.state_bits = ole.stream.read_u32_le();
		this.creation_time = ole.stream.read_u64_le();
		this.modified_time = ole.stream.read_u64_le();
		this.starting_sector_location = ole.stream.read_u32_le();
		this.stream_size = ole.stream.read_u64_le();
	}
	
	read_all()
	{
		this.ole.stream.seek_to((this.starting_sector_location + 1) * this.ole.header.sector_size);
		return new U8Stream(this.ole.stream.read(Number(this.stream_size)));
	}
}
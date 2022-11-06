/*

altium.js schematic document parser - u8stream helper

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


class U8Stream extends Uint8Array
{
	u8stream_position = 0;
	
	reset()
	{
		this.u8stream_position = 0;
	}
	
	seek_to(pos)
	{
		if (pos == null || !(typeof pos === 'number') || !Number.isInteger(pos))
		{
			throw new Error("Position must be an integer.");
		}
		if (pos < 0)
		{
			throw new Error("Attempted to seek to a negative position.");
		}
		if (pos >= this.length)
		{
			throw new Error("Attempted to seek past the end of the array.");
		}
		this.u8stream_position = pos;
	}
	
	seek_relative(distance)
	{
		if (distance == null || !(typeof distance === 'number') || !Number.isInteger(distance))
		{
			throw new Error("Distance must be an integer.");
		}
		let pos = this.u8stream_position ?? 0;
		pos += distance;
		if (pos < 0)
		{
			throw new Error("Attempted to seek to a negative position.");
		}
		if (pos >= this.length)
		{
			throw new Error("Attempted to seek past the end of the array.");
		}
		this.u8stream_position = pos;
	}
	
	read(length, useBuffer=false)
	{
		if (length == null || !(typeof length === 'number') || !Number.isInteger(length))
		{
			throw new Error("Length must be an integer.");
		}
		if (length < 0)
		{
			throw new Error("Attempted to read a negative number of bytes.");
		}
		if (length == 0)
			return useBuffer ? new ArrayBuffer([]) : new Uint8Array([]);
		
		let pos = this.u8stream_position ?? 0;
		if (pos + length > this.length)
		{
			throw new Error("Attempted to read past the end of the array.");
		}
		
		let target = useBuffer ? this.buffer : this;
		let result = target.slice(pos, pos + length);
		this.u8stream_position = pos + length;
		return result;
	}
	
	read_u8()
	{
		return this.read(1)[0];
	}
	
	read_u16(littleEndian)
	{
		if (this.u8stream_position + 2 > this.length)
		{
			throw new Error("Attempted to read past the end of the array.");
		}
		if (this.bufferView == null)
		{
			this.bufferView = new DataView(this.buffer);
		}
		let value = this.bufferView.getUint16(this.u8stream_position, littleEndian);
		this.u8stream_position += 2;
		return value;
	}
	
	read_u16_be()
	{
		return this.read_u16(false);
	}
	
	read_u16_le()
	{
		return this.read_u16(true);
	}
	
	read_u32(littleEndian)
	{
		if (this.u8stream_position + 4 > this.length)
		{
			throw new Error("Attempted to read past the end of the array.");
		}
		if (this.bufferView == null)
		{
			this.bufferView = new DataView(this.buffer);
		}
		let value = this.bufferView.getUint32(this.u8stream_position, littleEndian);
		this.u8stream_position += 4;
		return value;
	}
	
	read_u32_be()
	{
		return this.read_u32(false);
	}
	
	read_u32_le()
	{
		return this.read_u32(true);
	}
	
	read_u64(littleEndian)
	{
		if (this.u8stream_position + 8 > this.length)
		{
			throw new Error("Attempted to read past the end of the array.");
		}
		if (this.bufferView == null)
		{
			this.bufferView = new DataView(this.buffer);
		}
		let value = this.bufferView.getBigUint64(this.u8stream_position, littleEndian);
		this.u8stream_position += 8;
		return value;
	}
	
	read_u64_be()
	{
		return this.read_u64(false);
	}
	
	read_u64_le()
	{
		return this.read_u64(true);
	}
}
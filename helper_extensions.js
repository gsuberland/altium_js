/*

altium.js schematic document parser - helper extensions

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


Uint8Array.prototype.compare_to = function(to, src_offset=0)
{
	if (to == null)
	{
		return false;
	}
	
	let target_len = 0;
	if (to instanceof ArrayBuffer)
	{
		target_len = to.byteLength;
	}
	else if (to instanceof Uint8Array)
	{
		target_len = to.length;
	}
	else
	{
		return false;
	}
	
	if (src_offset + target_len > this.length)
	{
		return false;
	}
	for (let i = 0; i < target_len; i++)
	{
		if (this[src_offset+i] != to[i])
			return false;
	}
	return true;
}

ArrayBuffer.prototype.compare_to = function(to, src_offset=0)
{
	if (to == null)
	{
		return false;
	}
	
	let target_len = 0;
	if (to instanceof ArrayBuffer)
	{
		target_len = to.byteLength;
	}
	else if (to instanceof Uint8Array)
	{
		target_len = to.length;
	}
	else
	{
		return false;
	}
	
	if (src_offset + target_len > this.byteLength)
	{
		return false;
	}
	for (let i = 0; i < target_len; i++)
	{
		if (this[src_offset+i] != to[i])
			return false;
	}
	return true;
}

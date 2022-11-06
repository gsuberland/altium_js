/*

altium.js schematic renderer

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


class AltiumSchematicRenderer
{
	constructor(canvas, document)
	{
		this.canvas = canvas;
		this.document = document;
	}
	
	#altiumColourToHex(colourInt)
	{
		return "#" + (colourInt & 0xFF).toString(16).padStart(2, '0') + ((colourInt >> 8) & 0xFF).toString(16).padStart(2, '0') + ((colourInt >> 16) & 0xFF).toString(16).padStart(2, '0');
	}
	
	#shouldShow(object)
	{
		if (object.owner_part_id == null || object.owner_part_id < 1)
			return true;
		
		const parent = object.find_parent(AltiumComponent);
		if (parent == null)
			return true;
		
		if (parent.current_part_id == null || parent.current_part_id < 1)
			return true;
		
		return parent.current_part_id == object.owner_part_id;
	}

	render()
	{
		let canvas = this.canvas;
		let doc = this.document;
		
		let sheetObject = doc.objects.find(o => o instanceof AltiumSheet);
		
		canvas.style.width = sheetObject.width + "px";
		canvas.style.height = sheetObject.height + "px";
		canvas.width = sheetObject.width * window.devicePixelRatio;
		canvas.height = sheetObject.height * window.devicePixelRatio;
		let areaColourInt = Number.parseInt(sheetObject.attributes.areacolor, 10);
		let areaColour = this.#altiumColourToHex(areaColourInt);
		canvas.style.backgroundColor = areaColour;
		let ctx = canvas.getContext('2d');
		ctx.scale(1, -1);
		ctx.translate(0.5, 0.5);
		ctx.translate(0, -canvas.height);
		ctx.font = "7pt sans-serif";
		ctx.textRendering = "optimizeLegibility";
		ctx.imageSmoothingQuality = "high";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = areaColour;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		let results = document.getElementById("results");

		let sheet = doc.objects.find((o) => o instanceof AltiumSheet);
		let gridLight = "#eeeeee";
		let gridDark = "#cccccc";
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.5;
		if (sheet.show_grid)
		{
			let n = 0;
			for (let x = 0; x < canvas.width; x += sheet.grid_size)
			{
				ctx.strokeStyle = ((n % 10) == 0) ? gridDark : gridLight;
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, canvas.height);
				ctx.stroke();
				n++;
			}
			n = 0;
			for (let y = 0; y < canvas.height; y += sheet.grid_size)
			{
				ctx.strokeStyle = ((n % 10) == 0) ? gridDark : gridLight;
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(canvas.width, y);
				ctx.stroke();
				n++;
			}
		}
		ctx.globalAlpha = 1;


		/*

		ctx.textAlign = "center";
		ctx.font = "bold 100px serif";
		ctx.fillStyle = "#333300";
		ctx.globalAlpha = 0.03;
		ctx.save();

		ctx.rotate(Math.PI/4);
		ctx.scale(1,-1);
		for (let y = 0; y < canvas.height * 2; y += 400)
		{
			ctx.fillText("PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA", canvas.width / 2, canvas.height - (y + 200));
			ctx.fillText("BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW - BETA - PREVIEW", canvas.width / 2, canvas.height - y);
		}

		ctx.textAlign = "left";
		*/

		let bom = [];
		bom.push("\"designator\", \"part\", \"description\"");
		for (let obj of doc.objects.filter((o) => o instanceof AltiumDesignator))
		{
			if (!this.#shouldShow(obj)) continue;
			
			let bomLine = "";
			//let designator = doc.objects.find((des) => des instanceof AltiumDesignator && des.owner_part_id == obj.current_part_id);
			let component = doc.object_from_record_index(obj.owner_record_index);
			if (component != null && component instanceof AltiumComponent)
			{
				bomLine += "\"" + obj.text + "\", \"" + component.design_item_id + "\", \"" + component.description.replaceAll("\"", "'") + "\"";
				bom.push(bomLine);
			}
			//bomLine += obj.description;
			
		}
		results.innerText = bom.join("\n");


		for (let obj of doc.objects.filter((o) => o instanceof AltiumWire))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = this.#altiumColourToHex(obj.colour);
			ctx.lineWidth = obj.width;
			ctx.beginPath();
			ctx.moveTo(obj.points[0].x, obj.points[0].y);
			for (let i = 1; i < obj.points.length; i++)
			{
				ctx.lineTo(obj.points[i].x, obj.points[i].y);
			}
			ctx.stroke();
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumRectangle))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (!obj.transparent)
			{
				ctx.fillStyle = this.#altiumColourToHex(obj.fill_colour);
				ctx.fillRect(obj.left, obj.top, obj.right - obj.left, obj.bottom - obj.top);
			}
			ctx.strokeStyle = this.#altiumColourToHex(obj.line_colour);
			ctx.strokeRect(obj.left, obj.top, obj.right - obj.left, obj.bottom - obj.top);
		}
		
		for (let obj of doc.objects.filter((o) => o instanceof AltiumTextFrame))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (!obj.transparent)
			{
				ctx.fillStyle = this.#altiumColourToHex(obj.fill_colour);
				ctx.fillRect(obj.left, obj.top, obj.right - obj.left, obj.bottom - obj.top);
			}
			if (obj.show_border)
			{
				ctx.strokeStyle = this.#altiumColourToHex(obj.border_colour);
				ctx.strokeRect(obj.left, obj.top, obj.right - obj.left, obj.bottom - obj.top);
			}
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumEllipse))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (!obj.transparent)
			{
				ctx.fillStyle = this.#altiumColourToHex(obj.fill_colour);
			}
			ctx.strokeStyle = this.#altiumColourToHex(obj.line_colour);
			ctx.beginPath();
			ctx.ellipse(obj.x, obj.y, obj.radius_x, obj.radius_y, 0, 0, Math.PI*2);
			ctx.stroke();
			if (!obj.transparent)
				ctx.fill();
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumPin))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = "#000000";
			ctx.beginPath();
			ctx.moveTo(obj.x, obj.y);
			ctx.lineTo(obj.x + obj.angle_vec[0] * obj.length, obj.y + obj.angle_vec[1] * obj.length);
			ctx.stroke();
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumLine))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = this.#altiumColourToHex(obj.colour);
			ctx.beginPath();
			ctx.moveTo(obj.x1, obj.y1);
			ctx.lineTo(obj.x2, obj.y2);
			ctx.stroke();
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumArc))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = this.#altiumColourToHex(obj.colour);
			ctx.lineWidth = obj.width;
			ctx.beginPath();
			ctx.arc(obj.x, obj.y, obj.radius, obj.start_angle * Math.PI/180, obj.end_angle * Math.PI/180);
			ctx.stroke();
			ctx.lineWidth = 1;
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumPolyline))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = this.#altiumColourToHex(obj.colour);
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.lineWidth = obj.width;
			
			switch (obj.line_style)
			{
				case 1:
					ctx.setLineDash([4, 4]);
					break;
				case 2:
					ctx.setLineDash([2, 2]);
					break;
				case 3:
					ctx.setLineDash([4, 2, 2, 4]);
					break;
			}
			
			ctx.beginPath();
			ctx.moveTo(obj.points[0].x, obj.points[0].y);
			for (let i = 1; i < obj.points.length; i++)
			{
				ctx.lineTo(obj.points[i].x, obj.points[i].y);
			}
			ctx.stroke();
			
			ctx.setLineDash([]);
			
			let pa = null;
			let pb = null;
			let shapeSize = obj.shape_size + 1;
			ctx.lineWidth = shapeSize;
			if (obj.start_shape > 0)
			{
				let pa = obj.points[1];
				let pb = obj.points[0];
				let dx = pb.x - pa.x;
				let dy = pb.y - pa.y;
				let angle = Math.atan2(dy, dx);
				const baseSize = 3 + shapeSize;
				let tax = pb.x - Math.cos(angle - Math.PI/6) * baseSize;
				let tay = pb.y - Math.sin(angle - Math.PI/6) * baseSize;
				let tbx = pb.x - Math.cos(angle + Math.PI/6) * baseSize;
				let tby = pb.y - Math.sin(angle + Math.PI/6) * baseSize;
				ctx.beginPath();
				ctx.moveTo(tax, tay);
				ctx.lineTo(pb.x + Math.cos(angle) * 0.5, pb.y + Math.sin(angle) * 0.5);
				ctx.lineTo(tbx, tby);
				ctx.stroke();
				if (obj.start_shape == 2 || obj.start_shape == 4)
					ctx.fill();
			}
			if (obj.end_shape > 0)
			{
				let pa = obj.points[obj.points.length - 2];
				let pb = obj.points[obj.points.length - 1];
				let dx = pb.x - pa.x;
				let dy = pb.y - pa.y;
				let angle = Math.atan2(dy, dx);
				const baseSize = 3 + shapeSize;
				let tax = pb.x - Math.cos(angle - Math.PI/6) * baseSize;
				let tay = pb.y - Math.sin(angle - Math.PI/6) * baseSize;
				let tbx = pb.x - Math.cos(angle + Math.PI/6) * baseSize;
				let tby = pb.y - Math.sin(angle + Math.PI/6) * baseSize;
				ctx.beginPath();
				ctx.moveTo(tax, tay);
				ctx.lineTo(pb.x + Math.cos(angle) * 0.5, pb.y + Math.sin(angle) * 0.5);
				ctx.lineTo(tbx, tby);
				ctx.stroke();
				if (obj.end_shape == 2 || obj.end_shape == 4)
					ctx.fill();
			}
			ctx.lineWidth = 1;
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumPolygon))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = this.#altiumColourToHex(obj.line_colour);
			ctx.fillStyle = this.#altiumColourToHex(obj.fill_colour);
			ctx.lineWidth = obj.width;
			ctx.beginPath();
			ctx.moveTo(obj.points[0].x, obj.points[0].y);
			for (let i = 1; i < obj.points.length; i++)
			{
				ctx.lineTo(obj.points[i].x, obj.points[i].y);
			}
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
			ctx.lineWidth = 1;
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumJunction))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.beginPath();
			ctx.ellipse(obj.x, obj.y, 2, 2, 0, 0, 2*Math.PI);
			ctx.fill();
		}

		for (let obj of doc.objects.filter((o) => o instanceof AltiumPowerPort))
		{
			if (!this.#shouldShow(obj)) continue;
			
			ctx.strokeStyle = this.#altiumColourToHex(obj.colour);
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.lineWidth = 1;
			if (!obj.is_off_sheet_connector)
			{
				switch (obj.style)
				{
					case 2:
						ctx.beginPath();
						ctx.moveTo(obj.x, obj.y);
						ctx.lineTo(obj.x, obj.y + 10);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(obj.x - 5, obj.y + 10);
						ctx.lineTo(obj.x + 5, obj.y + 10);
						ctx.stroke();
						break;
					case 4:
						ctx.beginPath();
						ctx.moveTo(obj.x - 10, obj.y);
						ctx.lineTo(obj.x + 10, obj.y);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(obj.x - 7.5, obj.y - 2);
						ctx.lineTo(obj.x + 7.5, obj.y - 2);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(obj.x - 5, obj.y - 4);
						ctx.lineTo(obj.x + 5, obj.y - 4);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(obj.x - 2.5, obj.y - 6);
						ctx.lineTo(obj.x + 2.5, obj.y - 6);
						ctx.stroke();
						break;
					case 6:
						ctx.beginPath();
						ctx.moveTo(obj.x, obj.y);
						ctx.lineTo(obj.x, obj.y - 5);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(obj.x - 5, obj.y - 5);
						ctx.lineTo(obj.x + 5, obj.y - 5);
						ctx.stroke();
						for (let g = -1; g < 2; g++)
						{
							ctx.beginPath();
							ctx.moveTo(obj.x + (g * 5), obj.y - 5);
							ctx.lineTo(obj.x + (g * 5) - 3, obj.y - 10);
							ctx.stroke();
						}
						break;
					default:
						ctx.fillRect(obj.x - 10, obj.y, 20, (obj.orientation == 1) ? 10 : -10);
						break;
				}
			}
			else
			{
				ctx.save();
				ctx.translate(obj.x, obj.y);
				ctx.rotate((obj.orientation - 1) * Math.PI/2);
				
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(-5, 5);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(5, 5);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 5);
				ctx.lineTo(-5, 10);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 5);
				ctx.lineTo(5, 10);
				ctx.stroke();
				
				ctx.restore();
			}
			//ctx.fillText(obj.style.toString(), obj.x, obj.y);
		}

		// store the transform for recovery later
		let savedTransform = ctx.getTransform();
		ctx.resetTransform();

		for (let obj of doc.objects.filter((o) => o instanceof AltiumLabel))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (obj.hidden)
				continue;
			ctx.textAlign = ["left", "center", "right"][obj.justification];
			ctx.textBaseline = ["bottom", "bottom", "top", "top"][obj.orientation];
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.save();
			ctx.translate(obj.x, canvas.height - obj.y);
			ctx.rotate(obj.orientation * -Math.PI/2);
			ctx.fillText(obj.text, 0, 0);
			ctx.restore();
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		for (let obj of doc.objects.filter((o) => o instanceof AltiumDesignator))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (obj.hidden)
				continue;
			ctx.textAlign = ["left", "left", "right", "right"][obj.orientation];
			ctx.textBaseline = ["bottom", "bottom", "top", "top"][obj.orientation];
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.fillText(obj.full_designator, obj.x, canvas.height - obj.y);
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		for (let obj of doc.objects.filter((o) => o instanceof AltiumParameter))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (obj.hidden || obj.is_implementation_parameter)
				continue;
			
			ctx.textAlign = ["left", "left", "right", "right"][obj.orientation];
			ctx.textBaseline = ["bottom", "bottom", "top", "top"][obj.orientation];
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			if (obj.orientation == 1)
			{
				ctx.save();
				ctx.translate(obj.x, canvas.height - obj.y);
				ctx.rotate(-Math.PI/2);
				ctx.fillText(obj.text, 0, 0);
				ctx.restore();
			}
			else if (obj.orientation == 3)
			{
				ctx.save();
				ctx.translate(obj.x, canvas.height - obj.y);
				ctx.rotate(Math.PI/2);
				ctx.fillText(obj.text, 0, 0);
				ctx.restore();
			}
			else
			{
				ctx.fillText(obj.text, obj.x, canvas.height - obj.y);
			}
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		for (let obj of doc.objects.filter((o) => o instanceof AltiumNetLabel))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (obj.hidden)
				continue;
			ctx.textAlign = ["left", "center", "right"][obj.justification];
			ctx.textBaseline = ["bottom", "bottom", "top", "top"][obj.orientation];
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			if (obj.orientation == 1)
			{
				ctx.save();
				ctx.translate(obj.x, canvas.height - obj.y);
				ctx.rotate(-Math.PI/2);
				ctx.fillText(obj.text, 0, 0);
				ctx.restore();
			}
			else if (obj.orientation == 3)
			{
				ctx.save();
				ctx.translate(obj.x, canvas.height - obj.y);
				ctx.rotate(Math.PI/2);
				ctx.fillText(obj.text, 0, 0);
				ctx.restore();
			}
			else
			{
				ctx.fillText(obj.text, obj.x, canvas.height - obj.y);
			}
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		for (let obj of doc.objects.filter((o) => o instanceof AltiumPin))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (!obj.show_name)
				continue;
			ctx.textAlign = ["right", "right", "left", "right"][obj.orientation];
			ctx.textBaseline = "middle";
			let objName = obj.name;
			let inverted = false;
			if (obj.name.includes("\\"))
			{
				objName = obj.name.replaceAll("\\", "");
				inverted = true;
			}
			if (obj.name_orientation != 0)
			{
				ctx.textBaseline = ["middle", "top", "middle", "bottom"][obj.orientation];
				if (obj.name_orientation <= 3)
					ctx.textAlign = ["left", "center", "right"][obj.name_orientation-1];
				else
					ctx.textAlign = "center";
			}
			let margin_x = [-1, 0, 1, 0][obj.orientation] * 2;
			let margin_y = [0, -1, 0, 1][obj.orientation] * 2;
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.strokeStyle = ctx.fillStyle;
			ctx.lineWidth = 1;
			if (obj.orientation == 1 && obj.name_orientation == 0)
			{
				ctx.save();
				ctx.translate(obj.x + margin_x, canvas.height - (obj.y + margin_y));
				ctx.rotate(-Math.PI/2);
				ctx.fillText(objName, 0, 0);
				if (inverted)
				{
					// todo: test this
					let textSize = ctx.measureText(objName);
					ctx.beginPath();
					ctx.moveTo(0, textSize.actualBoundingBoxAscent + 2);
					ctx.lineTo(textSize.width, textSize.actualBoundingBoxAscent + 2);
					ctx.stroke();
				}
				ctx.restore();
			}
			else if (obj.orientation == 3 && obj.name_orientation == 0)
			{
				ctx.save();
				ctx.translate(obj.x + margin_x, canvas.height - (obj.y + margin_y));
				ctx.rotate(Math.PI/2);
				ctx.fillText(objName, 0, 0);
				if (inverted)
				{
					// todo: test this
					let textSize = ctx.measureText(objName);
					ctx.beginPath();
					ctx.moveTo(0, textSize.actualBoundingBoxAscent + 2);
					ctx.lineTo(textSize.width, textSize.actualBoundingBoxAscent + 2);
					ctx.stroke();
				}
				ctx.restore();
			}
			else
			{
				ctx.fillText(objName, obj.x + margin_x, canvas.height - (obj.y + margin_y));
				if (inverted)
				{
					let textSize = ctx.measureText(objName);
					let offset = 0;
					switch (ctx.textAlign)
					{
						case "center":
							offset = -(textSize.width/2);
							break;
						case "right":
							offset = -textSize.width;
							break;
						case "left":
							offset = 0;
							break;
						default:
							offset = 0;
							break;
					}
					ctx.beginPath();
					ctx.moveTo(obj.x + margin_x + offset, canvas.height - (obj.y + margin_y + textSize.actualBoundingBoxAscent + 2));
					ctx.lineTo(obj.x + margin_x + offset + textSize.width, canvas.height - (obj.y + margin_y + textSize.actualBoundingBoxAscent + 2));
					ctx.stroke();
				}
			}
			
			ctx.setLineDash([]);
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		for (let obj of doc.objects.filter((o) => o instanceof AltiumPowerPort))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (!obj.show_text)
				continue;
			ctx.fillStyle = this.#altiumColourToHex(obj.colour);
			ctx.textBaseline = ["middle", "top", "middle", "bottom"][obj.orientation];
			ctx.textAlign = ["left", "center", "right", "center"][obj.orientation];
			let offset_x = [12, 0, -12, 0][obj.orientation];
			let offset_y = [0, 20, 0, -20][obj.orientation];
			ctx.fillText(obj.text, obj.x + offset_x, canvas.height - (obj.y + offset_y));
		}
		
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		let savedFont = ctx.font;
		for (let obj of doc.objects.filter((o) => o instanceof AltiumTextFrame))
		{
			if (!this.#shouldShow(obj)) continue;
			
			if (obj.font_id > 0 && doc.sheet.fonts[obj.font_id] != null)
			{
				const frameFont = doc.sheet.fonts[obj.font_id];
				const fontStr = (frameFont.size - 1).toString() + "px " + frameFont.name;
				if (fontStr.includes(":") || fontStr.includes("/") || !document.fonts.check(fontStr))
				{
					ctx.font = savedFont;
				}
				else
				{
					ctx.font = fontStr;
				}
			}
			
			ctx.fillStyle = this.#altiumColourToHex(obj.text_colour);
			ctx.textAlign = ["center", "left", "right"][obj.alignment];
			let offset_x = [(obj.right-obj.left)/2, obj.text_margin, (obj.right-obj.left) - obj.text_margin][obj.alignment];
			if (!obj.word_wrap)
			{
				ctx.fillText(obj.text.replaceAll("~1", "\n"), obj.left + offset_x, canvas.height - (obj.top + (obj.bottom-obj.top)/2));
			}
			else
			{
				// todo: refactor this so that an initial pass figures out all the line splits, then a second pass writes the text, so that vertical alignment can be supported.
				const text = obj.text.replaceAll("~1", "\n");
				const lines = text.split("\n");
				let ypos = 0;
				if (lines.length > 1)
				{
					// this is a total hack, but if there are multiple lines in the text then we can make a rough guess at how far up we need to shift the text to center it vertically
					// this doesn't correct for line wraps (see todo above for refactoring approach) but it's at least something I guess!
					const roughMeasure = ctx.measureText(text);
					ypos = ((roughMeasure.fontBoundingBoxDescent + roughMeasure.fontBoundingBoxAscent) * -lines.length) / 2;
				}
				const maxWidth = (obj.right - obj.left) + (obj.text_margin * 2);
				for (let line of lines)
				{
					const lineMeasure = ctx.measureText(line);
					if (lineMeasure.width <= maxWidth)
					{
						ctx.fillText(line, obj.left + offset_x, (canvas.height - (obj.top + (obj.bottom-obj.top)/2)) + ypos);
						ypos += lineMeasure.fontBoundingBoxDescent + lineMeasure.fontBoundingBoxAscent;
					}
					else
					{
						let words = line.split(" ");
						while (words.length > 0)
						{
							if (words.length == 1)
							{
								// we only have one word, either because that's just how many we had or because the final word is super long
								const lastWord = words[0];
								const lastWordMeasure = ctx.measureText(lastWord);
								ctx.fillText(lastWord, obj.left + offset_x, (canvas.height - (obj.top + (obj.bottom-obj.top)/2)) + ypos);
								ypos += lastWordMeasure.fontBoundingBoxDescent + lineMeasure.fontBoundingBoxAscent;
								words = [];
								break;
							}
							for (let wc = words.length; wc > 0; wc--)
							{
								const partialLine = words.slice(0, wc - 1).join(" ");
								const partialMeasure = ctx.measureText(partialLine);
								if (partialMeasure.width <= maxWidth || wc == 1)
								{
									ctx.fillText(partialLine, obj.left + offset_x, (canvas.height - (obj.top + (obj.bottom-obj.top)/2)) + ypos);
									ypos += partialMeasure.fontBoundingBoxDescent + lineMeasure.fontBoundingBoxAscent;
									words = words.slice(wc - 1);
									break;
								}
							}
						}
					}
				}
			}
		}
		ctx.font = savedFont;
		
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";

		ctx.setTransform(savedTransform);

		savedFont = ctx.font;
		ctx.textAlign = "left";
		ctx.font = "bold 33px sans-serif";
		ctx.fillStyle = "#000000";
		ctx.globalAlpha = 0.2;
		ctx.save();
		ctx.scale(1,-1);
		ctx.fillText("Preview generated by altium.js", 10, -(canvas.height - 50));
		ctx.font = "bold 15px sans-serif";
		ctx.fillText("for reference purposes only. schematic accuracy not guaranteed.", 12, -(canvas.height - 75));
		ctx.restore();
		ctx.globalAlpha = 1;
		ctx.font = savedFont;
	}
}
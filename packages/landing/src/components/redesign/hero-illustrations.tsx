import type { ReactElement } from "react";

type PixelSpec = {
	c: string;
	id: string;
	x: number;
	y: number;
};

const F = "var(--foreground)";
const P = "var(--neon-pink)";
const C = "var(--neon-cyan)";

export function FloatingDecor(): ReactElement {
	return (
		<>
			<div className="pointer-events-none absolute top-32 left-6 hidden w-44 deco-bob lg:block">
				<PixelRobot />
			</div>
			<div className="pointer-events-none absolute top-28 right-6 hidden w-44 deco-bob-slow lg:block">
				<PixelCassette />
			</div>
		</>
	);
}

function Pixel({ x, y, c = F }: Omit<PixelSpec, "id">): ReactElement {
	return <rect fill={c} height="1" width="1" x={x} y={y} />;
}

function toPixel([x, y, c]: [number, number, string]): PixelSpec {
	return { c, id: `${x}-${y}-${c}`, x, y };
}

function PixelRobot(): ReactElement {
	const base = (
		[
			[8, 0, F],
			[8, 1, F],
			[7, 2, F],
			[9, 2, F],
			...row(5, 11, 3, F),
			[4, 4, F],
			[12, 4, F],
			[4, 5, F],
			[12, 5, F],
			[4, 6, F],
			[12, 6, F],
			[4, 7, F],
			[12, 7, F],
			...row(5, 11, 8, F),
			...row(5, 11, 4, C),
			[6, 5, F],
			[9, 5, F],
			...row(5, 11, 6, C),
			[5, 7, C],
			...row(6, 10, 7, F),
			[11, 7, C],
			...row(7, 9, 9, F),
			...row(3, 13, 10, F),
			[3, 11, F],
			[7, 11, F],
			[9, 11, F],
			[13, 11, F],
			[3, 12, F],
			[7, 12, F],
			[9, 12, F],
			[13, 12, F],
			[3, 13, F],
			[7, 13, F],
			[9, 13, F],
			[13, 13, F],
			...row(3, 13, 14, F),
			...chestPixels(),
			[5, 15, F],
			[6, 15, F],
			[10, 15, F],
			[11, 15, F],
			[5, 16, F],
			[6, 16, F],
			[10, 16, F],
			[11, 16, F],
			...row(4, 7, 17, F),
			...row(9, 12, 17, F),
		] as [number, number, string][]
	).map(toPixel);
	const eyes = [
		[5, 5],
		[7, 5],
		[8, 5],
		[10, 5],
		[11, 5],
	];

	return (
		<svg
			aria-hidden="true"
			className="h-auto w-full"
			shapeRendering="crispEdges"
			viewBox="0 0 17 18"
		>
			{base.map((pixel) => (
				<Pixel c={pixel.c} key={pixel.id} x={pixel.x} y={pixel.y} />
			))}
			<g className="deco-blink">
				{eyes.map(([x, y]) => (
					<Pixel c={P} key={`eye-${x}-${y}`} x={x} y={y} />
				))}
			</g>
			<rect className="deco-led" height="1" width="1" x="8" y="2" />
		</svg>
	);
}

function PixelCassette(): ReactElement {
	const body: PixelSpec[] = [];
	const push = (x: number, y: number, c: string, id: string): void => {
		body.push({ c, id, x, y });
	};

	for (let x = 1; x < 17; x += 1) {
		push(x, 0, F, `top-${x}`);
		push(x, 11, F, `bottom-${x}`);
	}
	for (let y = 0; y < 12; y += 1) {
		push(0, y, F, `left-${y}`);
		push(17, y, F, `right-${y}`);
	}
	for (let x = 1; x < 17; x += 1) {
		for (let y = 1; y < 11; y += 1) {
			push(x, y, "var(--card)", `fill-${x}-${y}`);
		}
	}
	for (let x = 2; x < 16; x += 1) {
		push(x, 1, P, `pink-a-${x}`);
		push(x, 2, P, `pink-b-${x}`);
		push(x, 3, P, `pink-c-${x}`);
	}
	for (let x = 3; x < 15; x += 1) {
		push(x, 2, F, `stripe-${x}`);
	}
	addSocket(body, 5, 7, "left");
	addSocket(body, 12, 7, "right");
	for (const [x, y] of [
		[3, 10],
		[4, 10],
		[13, 10],
		[14, 10],
	]) {
		push(x, y, F, `notch-${x}-${y}`);
	}

	return (
		<svg
			aria-hidden="true"
			className="h-auto w-full"
			shapeRendering="crispEdges"
			viewBox="0 0 18 12"
		>
			{body.map((pixel) => (
				<Pixel c={pixel.c} key={pixel.id} x={pixel.x} y={pixel.y} />
			))}
			<Reel className="deco-spin-l" cx={5} cy={7} />
			<Reel className="deco-spin-r" cx={12} cy={7} />
			<g className="deco-tape">
				{[7, 8, 9, 10].map((x) => (
					<Pixel c={F} key={`tape-${x}`} x={x} y={7} />
				))}
			</g>
		</svg>
	);
}

function row(
	start: number,
	end: number,
	y: number,
	c: string,
): [number, number, string][] {
	return Array.from({ length: end - start + 1 }, (_, offset) => [
		start + offset,
		y,
		c,
	]);
}

function chestPixels(): [number, number, string][] {
	return [
		...row(4, 6, 11, P),
		[8, 11, P],
		...row(10, 12, 11, P),
		[4, 12, P],
		[6, 12, P],
		[8, 12, P],
		[10, 12, P],
		[12, 12, P],
		...row(4, 6, 13, P),
		[8, 13, P],
		...row(10, 12, 13, P),
	];
}

function addSocket(
	body: PixelSpec[],
	cx: number,
	cy: number,
	id: string,
): void {
	for (let dx = -2; dx <= 2; dx += 1) {
		for (let dy = -2; dy <= 2; dy += 1) {
			if (Math.abs(dx) + Math.abs(dy) <= 3) {
				body.push({
					c: F,
					id: `${id}-socket-${dx}-${dy}`,
					x: cx + dx,
					y: cy + dy,
				});
			}
		}
	}
}

function Reel({
	className,
	cx,
	cy,
}: {
	className: string;
	cx: number;
	cy: number;
}): ReactElement {
	const spokes = [
		[cx, cy],
		[cx - 1, cy],
		[cx + 1, cy],
		[cx, cy - 1],
		[cx, cy + 1],
	];

	return (
		<g className={className}>
			{spokes.map(([x, y]) => (
				<Pixel c={C} key={`${className}-${x}-${y}`} x={x} y={y} />
			))}
		</g>
	);
}

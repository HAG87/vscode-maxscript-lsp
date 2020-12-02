/*
const ctx: Worker = self as any;

class SieveOfEratosthenes
{

	calculate(limit: number)
	{

		const sieve = [];
		const primes: number[] = [];
		let k;
		let l;

		sieve[1] = false;
		for (k = 2; k <= limit; k += 1) {
			sieve[k] = true;
		}

		for (k = 2; k * k <= limit; k += 1) {
			if (sieve[k] !== true) {
				continue;
			}
			for (l = k * k; l <= limit; l += k) {
				sieve[l] = false;
			}
		}

		sieve.forEach(function (value, key)
		{
			if (value) {
				primes.push(key);
			}
		});

		return primes;

	}

}

const sieve = new SieveOfEratosthenes();


ctx.addEventListener('message', (event) =>
{
	const limit = event.data.limit;
	const primes = sieve.calculate(limit);
	ctx.postMessage({ primes });
});
*/